#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""mythril.py: Bug hunting on the Ethereum blockchain

   http://www.github.com/ConsenSys/mythril
"""

import logging
import json
import sys
import argparse

# logging.basicConfig(level=logging.DEBUG)

from mythril.exceptions import CriticalError
from mythril.mythril import Mythril
from mythril.version import VERSION

from subprocess import Popen, PIPE
import json


def exit_with_error(format, message):
    if format == 'text' or format == 'markdown':
        print(message)
    else:
        result = {'success': False, 'error': str(message), 'issues': []}
        print(json.dumps(result))
    sys.exit()


def main():
    parser = argparse.ArgumentParser(description='Security analysis of Ethereum smart contracts')
    parser.add_argument("solidity_file", nargs='*')

    commands = parser.add_argument_group('commands')
    commands.add_argument('-g', '--graph', help='generate a control flow graph')
    commands.add_argument('-V', '--version', action='store_true',
                          help='print the Mythril version number and exit')
    commands.add_argument('-x', '--fire-lasers', action='store_true',
                          help='detect vulnerabilities, use with -c, -a or solidity file(s)')
    commands.add_argument('-t', '--truffle', action='store_true',
                          help='analyze a truffle project (run from project dir)')
    commands.add_argument('-d', '--disassemble', action='store_true', help='print disassembly')
    commands.add_argument('-j', '--statespace-json', help='dumps the statespace json', metavar='OUTPUT_FILE')

    inputs = parser.add_argument_group('input arguments')
    inputs.add_argument('-c', '--code', help='hex-encoded bytecode string ("6060604052...")', metavar='BYTECODE')
    inputs.add_argument('-a', '--address', help='pull contract from the blockchain', metavar='CONTRACT_ADDRESS')
    inputs.add_argument('-l', '--dynld', action='store_true', help='auto-load dependencies from the blockchain')

    outputs = parser.add_argument_group('output formats')
    outputs.add_argument('-o', '--outform', choices=['text', 'markdown', 'json'], default='text',
                         help='report output format', metavar='<text/json>')
    outputs.add_argument('--verbose-report', action='store_true', help='Include debugging information in report')

    database = parser.add_argument_group('local contracts database')
    database.add_argument('-s', '--search', help='search the contract database', metavar='EXPRESSION')
    database.add_argument('--leveldb-dir', help='specify leveldb directory for search or direct access operations', metavar='LEVELDB_PATH')

    utilities = parser.add_argument_group('utilities')
    utilities.add_argument('--hash', help='calculate function signature hash', metavar='SIGNATURE')
    utilities.add_argument('--storage', help='read state variables from storage index, use with -a',
                           metavar='INDEX,NUM_SLOTS,[array] / mapping,INDEX,[KEY1, KEY2...]')
    utilities.add_argument('--solv',
                           help='specify solidity compiler version. If not present, will try to install it (Experimental)',
                           metavar='SOLV')
    utilities.add_argument('--contract-hash-to-address', help='returns corresponding address for a contract address hash', metavar='SHA3_TO_LOOK_FOR')

    options = parser.add_argument_group('options')
    options.add_argument('-m', '--modules', help='Comma-separated list of security analysis modules', metavar='MODULES')
    options.add_argument('--max-depth', type=int, default=22, help='Maximum recursion depth for symbolic execution')
    options.add_argument('--execution-timeout', type=int, default=600, help="The amount of seconds to spend on "
                                                                           "symbolic execution")
    outputs.add_argument('--strategy', choices=['dfs', 'bfs'], default='dfs',
                         help='Symbolic execution strategy')

    options.add_argument('--solc-args', help='Extra arguments for solc')
    options.add_argument('--phrack', action='store_true', help='Phrack-style call graph')
    options.add_argument('--enable-physics', action='store_true', help='enable graph physics simulation')
    options.add_argument('-v', type=int, help='log level (0-2)', metavar='LOG_LEVEL')

    rpc = parser.add_argument_group('RPC options')
    rpc.add_argument('-i', action='store_true', help='Preset: Infura Node service (Mainnet)')
    rpc.add_argument('--rpc', help='custom RPC settings', metavar='HOST:PORT / ganache / infura-[network_name]')
    rpc.add_argument('--rpctls', type=bool, default=False, help='RPC connection over TLS')
    rpc.add_argument('--ipc', action='store_true', help='Connect via local IPC')
    rpc.add_argument('--leveldb', action='store_true', help='Enable direct leveldb access operations')

    # Get config values

    args = parser.parse_args()

    if args.version:
        print("Mythril version {}".format(VERSION))
        sys.exit()

    # Parse cmdline args

    if not (args.search or args.hash or args.disassemble or args.graph or args.fire_lasers
            or args.storage or args.truffle or args.statespace_json or args.contract_hash_to_address):
        parser.print_help()
        sys.exit()

    if args.v:
        if 0 <= args.v < 3:
            logging.basicConfig(level=[logging.NOTSET, logging.INFO, logging.DEBUG][args.v])
        else:
            exit_with_error(args.outform, "Invalid -v value, you can find valid values in usage")

    # -- commands --
    if args.hash:
        print(Mythril.hash_for_function_signature(args.hash))
        sys.exit()

    try:
        # the mythril object should be our main interface
        # infura = None, rpc = None, rpctls = None, ipc = None,
        # solc_args = None, dynld = None, max_recursion_depth = 12):

        mythril = Mythril(solv=args.solv, dynld=args.dynld,
                          solc_args=args.solc_args)
        if args.dynld and not (args.ipc or args.rpc or args.i):
            mythril.set_api_from_config_path()

        if args.address and not args.leveldb:
            # Establish RPC/IPC connection if necessary
            if args.i:
                mythril.set_api_rpc_infura()
            elif args.rpc:
                mythril.set_api_rpc(rpc=args.rpc, rpctls=args.rpctls)
            elif args.ipc:
                mythril.set_api_ipc()
            elif not args.dynld:
                mythril.set_api_rpc_localhost()
        elif args.leveldb or args.search or args.contract_hash_to_address:
            # Open LevelDB if necessary
            mythril.set_api_leveldb(mythril.leveldb_dir if not args.leveldb_dir else args.leveldb_dir)

        if args.search:
            # Database search ops
            mythril.search_db(args.search)
            sys.exit()

        if args.contract_hash_to_address:
            # search corresponding address
            mythril.contract_hash_to_address(args.contract_hash_to_address)
            sys.exit()

        if args.truffle:
            try:
                # not really pythonic atm. needs refactoring
                mythril.analyze_truffle_project(args)
            except FileNotFoundError:
                print(
                    "Build directory not found. Make sure that you start the analysis from the project root, and that 'truffle compile' has executed successfully.")
            sys.exit()

        # Load / compile input contracts
        address = None

        if args.code:
            # Load from bytecode
            address, _ = mythril.load_from_bytecode(args.code)
        elif args.address:
            # Get bytecode from a contract address
            address, _ = mythril.load_from_address(args.address)
        elif args.solidity_file:
            # Compile Solidity source file(s)
            if args.graph and len(args.solidity_file) > 1:
                exit_with_error(args.outform,
                                "Cannot generate call graphs from multiple input files. Please do it one at a time.")
            address, _ = mythril.load_from_solidity(args.solidity_file)  # list of files
        else:
            exit_with_error(args.outform,
                            "No input bytecode. Please provide EVM code via -c BYTECODE, -a ADDRESS, or -i SOLIDITY_FILES")

        # Commands

        if args.storage:
            if not args.address:
                exit_with_error(args.outform,
                                "To read storage, provide the address of a deployed contract with the -a option.")

            storage = mythril.get_state_variable_from_storage(address=address,
                                                              params=[a.strip() for a in args.storage.strip().split(",")])
            print(storage)

        elif args.disassemble:
            easm_text = mythril.contracts[0].get_easm() # or mythril.disassemble(mythril.contracts[0])
            sys.stdout.write(easm_text)

        elif args.graph or args.fire_lasers:
            if not mythril.contracts:
                exit_with_error(args.outform, "input files do not contain any valid contracts")

            if args.graph:
                html = mythril.graph_html(strategy=args.strategy, contract=mythril.contracts[0], address=address,
                                          enable_physics=args.enable_physics, phrackify=args.phrack,
                                          max_depth=args.max_depth)

                try:
                    with open(args.graph, "w") as f:
                        f.write(html)
                except Exception as e:
                    exit_with_error(args.outform, "Error saving graph: " + str(e))

            else:
                report = mythril.fire_lasers(strategy=args.strategy, address=address,
                                             modules=[m.strip() for m in args.modules.strip().split(",")] if args.modules else [],
                                             verbose_report=args.verbose_report,
                                             max_depth=args.max_depth, execution_timeout=args.execution_timeout)
                outputs = {
                    'json': report.as_json(),
                    'text': report.as_text(),
                    'markdown': report.as_markdown()
                }
                #输出
                print(outputs[args.outform])

        elif args.statespace_json:

            if not mythril.contracts:
                exit_with_error(args.outform, "input files do not contain any valid contracts")

            statespace = mythril.dump_statespace(strategy=args.strategy, contract=mythril.contracts[0], address=address, max_depth=args.max_depth)

            try:
                with open(args.statespace_json, "w") as f:
                    json.dump(statespace, f)
            except Exception as e:
                exit_with_error(args.outform, "Error saving json: " + str(e))

        else:
            parser.print_help()

    except CriticalError as ce:
        exit_with_error(args.outform, str(ce))


def mymain(file):

    #   --zyx
    cmd = ["solc", "--combined-json", "bin,bin-runtime,srcmap-runtime", '--allow-paths', "."]
    cmd.append(file)
    p = Popen(cmd, stdout=PIPE, stderr=PIPE)

    stdout, stderr = p.communicate()
    ret = p.returncode
    if ret != 0:
        return "Solc experienced a fatal error (code" + str(ret) + ").\n\n" + str(stderr.decode('UTF-8')), 0
    #  --zyx


    parser = argparse.ArgumentParser(description='Security analysis of Ethereum smart contracts')
    parser.add_argument("solidity_file", nargs='*')

    commands = parser.add_argument_group('commands')
    commands.add_argument('-g', '--graph', help='generate a control flow graph')
    commands.add_argument('-V', '--version', action='store_true',
                          help='print the Mythril version number and exit')
    commands.add_argument('-x', '--fire-lasers', action='store_true',
                          help='detect vulnerabilities, use with -c, -a or solidity file(s)')
    commands.add_argument('-t', '--truffle', action='store_true',
                          help='analyze a truffle project (run from project dir)')
    commands.add_argument('-d', '--disassemble', action='store_true', help='print disassembly')
    commands.add_argument('-j', '--statespace-json', help='dumps the statespace json', metavar='OUTPUT_FILE')

    inputs = parser.add_argument_group('input arguments')
    inputs.add_argument('-c', '--code', help='hex-encoded bytecode string ("6060604052...")', metavar='BYTECODE')
    inputs.add_argument('-a', '--address', help='pull contract from the blockchain', metavar='CONTRACT_ADDRESS')
    inputs.add_argument('-l', '--dynld', action='store_true', help='auto-load dependencies from the blockchain')

    outputs = parser.add_argument_group('output formats')
    outputs.add_argument('-o', '--outform', choices=['text', 'markdown', 'json'], default='text',
                         help='report output format', metavar='<text/json>')
    outputs.add_argument('--verbose-report', action='store_true', help='Include debugging information in report')

    database = parser.add_argument_group('local contracts database')
    database.add_argument('-s', '--search', help='search the contract database', metavar='EXPRESSION')
    database.add_argument('--leveldb-dir', help='specify leveldb directory for search or direct access operations', metavar='LEVELDB_PATH')

    utilities = parser.add_argument_group('utilities')
    utilities.add_argument('--hash', help='calculate function signature hash', metavar='SIGNATURE')
    utilities.add_argument('--storage', help='read state variables from storage index, use with -a',
                           metavar='INDEX,NUM_SLOTS,[array] / mapping,INDEX,[KEY1, KEY2...]')
    utilities.add_argument('--solv',
                           help='specify solidity compiler version. If not present, will try to install it (Experimental)',
                           metavar='SOLV')
    utilities.add_argument('--contract-hash-to-address', help='returns corresponding address for a contract address hash', metavar='SHA3_TO_LOOK_FOR')

    options = parser.add_argument_group('options')
    options.add_argument('-m', '--modules', help='Comma-separated list of security analysis modules', metavar='MODULES')
    options.add_argument('--max-depth', type=int, default=22, help='Maximum recursion depth for symbolic execution')
    options.add_argument('--execution-timeout', type=int, default=600, help="The amount of seconds to spend on "
                                                                           "symbolic execution")
    outputs.add_argument('--strategy', choices=['dfs', 'bfs'], default='dfs',
                         help='Symbolic execution strategy')

    options.add_argument('--solc-args', help='Extra arguments for solc')
    options.add_argument('--phrack', action='store_true', help='Phrack-style call graph')
    options.add_argument('--enable-physics', action='store_true', help='enable graph physics simulation')
    options.add_argument('-v', type=int, help='log level (0-2)', metavar='LOG_LEVEL')

    rpc = parser.add_argument_group('RPC options')
    rpc.add_argument('-i', action='store_true', help='Preset: Infura Node service (Mainnet)')
    rpc.add_argument('--rpc', help='custom RPC settings', metavar='HOST:PORT / ganache / infura-[network_name]')
    rpc.add_argument('--rpctls', type=bool, default=False, help='RPC connection over TLS')
    rpc.add_argument('--ipc', action='store_true', help='Connect via local IPC')
    rpc.add_argument('--leveldb', action='store_true', help='Enable direct leveldb access operations')

    # Get config values
    # args = parser.parse_args()
    # print("args: "+str(type(args)))
    # print("args : " + str(args))
    # I did it --zyx
    arrr = argparse.Namespace(address=None,
                    code=None,
                    contract_hash_to_address=None,
                    disassemble=False,
                    dynld=False,
                    enable_physics=False,
                    execution_timeout=600,
                    fire_lasers=True,
                    graph=None,
                    hash=None,
                    i=False,
                    ipc=False,
                    leveldb=False,
                    leveldb_dir=None,
                    max_depth=22,
                    modules=None,
                    outform='text',
                    phrack=False,
                    rpc=None,
                    rpctls=False,
                    search=None,
                    solc_args=None,
                    solidity_file=[str(file)],
                    solv=None,
                    statespace_json=None,
                    storage=None,
                    strategy='dfs',
                    truffle=False,
                    v=None,
                    verbose_report=False,
                    version=False)
    '''
    args : Namespace(address=None, 
                    code=None, 
                    contract_hash_to_address=None, 
                    disassemble=False, 
                    dynld=False, 
                    enable_physics=False, 
                    execution_timeout=600, 
                    fire_lasers=True, 
                    graph=None, 
                    hash=None, 
                    i=False, 
                    ipc=False, 
                    leveldb=False, 
                    leveldb_dir=None, 
                    max_depth=22, 
                    modules=None, 
                    outform='text', 
                    phrack=False, 
                    rpc=None, 
                    rpctls=False, 
                    search=None, 
                    solc_args=None, 
                    solidity_file=['calls.sol'], 
                    solv=None, 
                    statespace_json=None, 
                    storage=None, 
                    strategy='dfs', 
                    truffle=False,
                    v=None, 
                    verbose_report=False, 
                    version=False)
    '''
    # the rest arrr if changed from  args  and It's me who did this --zyx
    if arrr.version:
        print("Mythril version {}".format(VERSION))
        sys.exit()

    # Parse cmdline args

    if not (arrr.search or arrr.hash or arrr.disassemble or arrr.graph or arrr.fire_lasers
            or arrr.storage or arrr.truffle or arrr.statespace_json or arrr.contract_hash_to_address):
        parser.print_help()
        sys.exit()

    if arrr.v:
        if 0 <= arrr.v < 3:
            logging.basicConfig(level=[logging.NOTSET, logging.INFO, logging.DEBUG][arrr.v])
        else:
            exit_with_error(arrr.outform, "Invalid -v value, you can find valid values in usage")

    # -- commands --
    if arrr.hash:
        print(Mythril.hash_for_function_signature(arrr.hash))
        sys.exit()

    try:
        # the mythril object should be our main interface
        # infura = None, rpc = None, rpctls = None, ipc = None,
        # solc_args = None, dynld = None, max_recursion_depth = 12):

        mythril = Mythril(solv=arrr.solv, dynld=arrr.dynld,
                          solc_args=arrr.solc_args)
        if arrr.dynld and not (arrr.ipc or arrr.rpc or arrr.i):
            mythril.set_api_from_config_path()

        if arrr.address and not arrr.leveldb:
            # Establish RPC/IPC connection if necessary
            if arrr.i:
                mythril.set_api_rpc_infura()
            elif arrr.rpc:
                mythril.set_api_rpc(rpc=arrr.rpc, rpctls=arrr.rpctls)
            elif arrr.ipc:
                mythril.set_api_ipc()
            elif not arrr.dynld:
                mythril.set_api_rpc_localhost()
        elif arrr.leveldb or arrr.search or arrr.contract_hash_to_address:
            # Open LevelDB if necessary
            mythril.set_api_leveldb(mythril.leveldb_dir if not arrr.leveldb_dir else arrr.leveldb_dir)

        if arrr.search:
            # Database search ops
            mythril.search_db(arrr.search)
            sys.exit()

        if arrr.contract_hash_to_address:
            # search corresponding address
            mythril.contract_hash_to_address(arrr.contract_hash_to_address)
            sys.exit()

        if arrr.truffle:
            try:
                # not really pythonic atm. needs refactoring
                mythril.analyze_truffle_project(arrr)
            except FileNotFoundError:
                print(
                    "Build directory not found. Make sure that you start the analysis from the project root, and that 'truffle compile' has executed successfully.")
            sys.exit()

        # Load / compile input contracts
        address = None

        if arrr.code:
            # Load from bytecode
            address, _ = mythril.load_from_bytecode(arrr.code)
        elif arrr.address:
            # Get bytecode from a contract address
            address, _ = mythril.load_from_address(arrr.address)
        elif arrr.solidity_file:
            # Compile Solidity source file(s)
            if arrr.graph and len(arrr.solidity_file) > 1:
                exit_with_error(arrr.outform,
                                "Cannot generate call graphs from multiple input files. Please do it one at a time.")
            address, _ = mythril.load_from_solidity(arrr.solidity_file)  # list of files
        else:
            exit_with_error(arrr.outform,
                            "No input bytecode. Please provide EVM code via -c BYTECODE, -a ADDRESS, or -i SOLIDITY_FILES")

        # Commands

        if arrr.storage:
            if not arrr.address:
                exit_with_error(arrr.outform,
                                "To read storage, provide the address of a deployed contract with the -a option.")

            storage = mythril.get_state_variable_from_storage(address=address,
                                                              params=[a.strip() for a in arrr.storage.strip().split(",")])
            print(storage)

        elif arrr.disassemble:
            easm_text = mythril.contracts[0].get_easm() # or mythril.disassemble(mythril.contracts[0])
            sys.stdout.write(easm_text)

        elif arrr.graph or arrr.fire_lasers:
            if not mythril.contracts:
                exit_with_error(arrr.outform, "input files do not contain any valid contracts")

            if arrr.graph:
                html = mythril.graph_html(strategy=arrr.strategy, contract=mythril.contracts[0], address=address,
                                          enable_physics=arrr.enable_physics, phrackify=arrr.phrack,
                                          max_depth=arrr.max_depth)

                try:
                    with open(arrr.graph, "w") as f:
                        f.write(html)
                except Exception as e:
                    exit_with_error(arrr.outform, "Error saving graph: " + str(e))

            else:
                report = mythril.fire_lasers(strategy=arrr.strategy, address=address,
                                             modules=[m.strip() for m in arrr.modules.strip().split(",")] if arrr.modules else [],
                                             verbose_report=arrr.verbose_report,
                                             max_depth=arrr.max_depth, execution_timeout=arrr.execution_timeout)
                outputs = {
                    'json': report.as_json(),
                    'text': report.as_text(),
                    'markdown': report.as_markdown()
                }
                #输出
                print(outputs[arrr.outform])

        elif arrr.statespace_json:

            if not mythril.contracts:
                exit_with_error(arrr.outform, "input files do not contain any valid contracts")

            statespace = mythril.dump_statespace(strategy=arrr.strategy, contract=mythril.contracts[0], address=address, max_depth=arrr.max_depth)

            try:
                with open(arrr.statespace_json, "w") as f:
                    json.dump(statespace, f)
            except Exception as e:
                exit_with_error(arrr.outform, "Error saving json: " + str(e))

        else:
            parser.print_help()

    except CriticalError as ce:
        exit_with_error(arrr.outform, str(ce))
    return mythril.zyx_lasers(strategy=arrr.strategy, address=address,
                                             modules=[m.strip() for m in arrr.modules.strip().split(",")] if arrr.modules else [],
                                             verbose_report=arrr.verbose_report,
                                             max_depth=arrr.max_depth, execution_timeout=arrr.execution_timeout),1

#
# if __name__ == "__main__":
#     main()
