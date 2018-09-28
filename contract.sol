contract bank{
    mapping(address=>uint) userBalances;
    
    function Bank() payable{
        uint a = 1;
    }
    
    function getUserBalance(address user) constant returns(uint){
        return userBalances[user];
    }
    function addToBalance() payable{
        userBalances[msg.sender] = userBalances[msg.sender] + msg.value;
    }
    function withdrawBalance(){
        uint amountToWithdraw = userBalances[msg.sender];
        if(msg.sender.call.value(amountToWithdraw)() == false){
            throw;
        }
        userBalances[msg.sender] = 0;
    }
    
    function getBalance() returns (uint){
        return this.balance;
    }
}