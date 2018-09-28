import mythril.interfaces.cli

class RUA:
    def __init__(self,file):
        self.issues,self.flag = mythril.interfaces.cli.mymain(file)

