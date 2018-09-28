import binascii
import rlp
from mythril.leveldb.accountindexing import CountableList
from mythril.leveldb.accountindexing import ReceiptForStorage, AccountIndexer
import logging
from ethereum import utils
from ethereum.block import BlockHeader, Block
from mythril.leveldb.state import State
from mythril.leveldb.eth_db import ETH_DB
from mythril.ether.ethcontract import ETHContract

# Per https://github.com/ethereum/go-ethereum/blob/master/core/database_util.go
# prefixes and suffixes for keys in geth
header_prefix = b'h'         # header_prefix + num (uint64 big endian) + hash -> header
body_prefix = b'b'           # body_prefix + num (uint64 big endian) + hash -> block body
num_suffix = b'n'            # header_prefix + num (uint64 big endian) + num_suffix -> hash
block_hash_prefix = b'H'      # block_hash_prefix + hash -> num (uint64 big endian)
block_receipts_prefix = b'r'  # block_receipts_prefix + num (uint64 big endian) + hash -> block receipts
# known geth keys
head_header_key = b'LastBlock'  # head (latest) header hash
# custom prefixes
address_prefix = b'AM'       # address_prefix + hash -> address
# custom keys
address_mapping_head_key = b'accountMapping'  # head (latest) number of indexed block
head_header_key = b'LastBlock'  # head (latest) header hash


def _format_block_number(number):
    '''
    formats block number to uint64 big endian
    '''
    return utils.zpad(utils.int_to_big_endian(number), 8)


def _encode_hex(v):
    '''
    encodes hash as hex
    '''
    return '0x' + utils.encode_hex(v)


class LevelDBReader(object):
    '''
    level db reading interface, can be used with snapshot
    '''

    def __init__(self, db):
        self.db = db
        self.head_block_header = None
        self.head_state = None

    def _get_head_state(self):
        '''
        gets head state
        '''
        if not self.head_state:
            root = self._get_head_block().state_root
            self.head_state = State(self.db, root)
        return self.head_state

    def _get_account(self, address):
        '''
        gets account by address
        '''
        state = self._get_head_state()
        account_address = binascii.a2b_hex(utils.remove_0x_head(address))
        return state.get_and_cache_account(account_address)

    def _get_block_hash(self, number):
        '''
        gets block hash by block number
        '''
        num = _format_block_number(number)
        hash_key = header_prefix + num + num_suffix
        return self.db.get(hash_key)

    def _get_head_block(self):
        '''
        gets head block header
        '''
        if not self.head_block_header:
            hash = self.db.get(head_header_key)
            num = self._get_block_number(hash)
            self.head_block_header = self._get_block_header(hash, num)
            # find header with valid state
            while not self.db.get(self.head_block_header.state_root) and self.head_block_header.prevhash is not None:
                hash = self.head_block_header.prevhash
                num = self._get_block_number(hash)
                self.head_block_header = self._get_block_header(hash, num)

        return self.head_block_header

    def _get_block_number(self, hash):
        '''
        gets block number by hash
        '''
        number_key = block_hash_prefix + hash
        return self.db.get(number_key)

    def _get_block_header(self, hash, num):
        '''
        get block header by block header hash & number
        '''
        header_key = header_prefix + num + hash
        block_header_data = self.db.get(header_key)
        header = rlp.decode(block_header_data, sedes=BlockHeader)
        return header

    def _get_address_by_hash(self, hash):
        '''
        get mapped address by its hash
        '''
        address_key = address_prefix + hash
        return self.db.get(address_key)

    def _get_last_indexed_number(self):
        '''
        latest indexed block number
        '''
        return self.db.get(address_mapping_head_key)

    def _get_block_receipts(self, hash, num):
        '''
        get block transaction receipts by block header hash & number
        '''
        number = _format_block_number(num)
        receipts_key = block_receipts_prefix + number + hash
        receipts_data = self.db.get(receipts_key)
        receipts = rlp.decode(receipts_data, sedes=CountableList(ReceiptForStorage))
        return receipts


class LevelDBWriter(object):
    '''
    level db writing interface
    '''

    def __init__(self, db):
        self.db = db
        self.wb = None

    def _set_last_indexed_number(self, number):
        '''
        sets latest indexed block number
        '''
        return self.db.put(address_mapping_head_key, _format_block_number(number))

    def _start_writing(self):
        '''
        start writing a batch
        '''
        self.wb = self.db.write_batch()

    def _commit_batch(self):
        '''
        commit batch
        '''
        self.wb.write()

    def _store_account_address(self, address):
        '''
        get block transaction receipts by block header hash & number
        '''
        address_key = address_prefix + utils.sha3(address)
        self.wb.put(address_key, address)


class EthLevelDB(object):
    '''
    Go-Ethereum LevelDB client class
    '''

    def __init__(self, path):
        self.path = path
        self.db = ETH_DB(path)
        self.reader = LevelDBReader(self.db)
        self.writer = LevelDBWriter(self.db)

    def get_contracts(self):
        '''
        iterate through all contracts
        '''
        indexer = AccountIndexer(self)
        for account in self.reader._get_head_state().get_all_accounts():
            if account.code is not None:
                code = _encode_hex(account.code)
                contract = ETHContract(code)
                address = indexer.get_contract_by_hash(account.address)
                if address is None:
                    address = account.address
                yield contract, _encode_hex(address), account.balance

    def search(self, expression, callback_func):
        '''
        searches through non-zero balance contracts
        '''
        cnt = 0

        for contract, address, balance in self.get_contracts():

            if contract.matches_expression(expression):
                callback_func(contract.name, contract, [address], [balance])

            cnt += 1

            if not cnt % 1000:
                logging.info("Searched %d contracts" % cnt)

    def contract_hash_to_address(self, hash):
        '''
        tries to find corresponding account address
        '''
        indexer = AccountIndexer(self)
        address_hash = binascii.a2b_hex(utils.remove_0x_head(hash))
        address = indexer.get_contract_by_hash(address_hash)
        if address:
            return _encode_hex(address)
        else:
            return "Not found"

    def eth_getBlockHeaderByNumber(self, number):
        '''
        gets block header by block number
        '''
        hash = self.reader._get_block_hash(number)
        block_number = _format_block_number(number)
        return self.reader._get_block_header(hash, block_number)

    def eth_getBlockByNumber(self, number):
        '''
        gets block body by block number
        '''
        block_hash = self.reader._get_block_hash(number)
        block_number = _format_block_number(number)
        body_key = body_prefix + block_number + block_hash
        block_data = self.db.get(body_key)
        body = rlp.decode(block_data, sedes=Block)
        return body

    def eth_getCode(self, address):
        '''
        gets account code
        '''
        account = self.reader._get_account(address)
        return _encode_hex(account.code)

    def eth_getBalance(self, address):
        '''
        gets account balance
        '''
        account = self.reader._get_account(address)
        return account.balance

    def eth_getStorageAt(self, address, position):
        '''
        gets account storage data at position
        '''
        account = self.reader._get_account(address)
        return _encode_hex(utils.zpad(utils.encode_int(account.get_storage_data(position)), 32))
