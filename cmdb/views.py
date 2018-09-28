from django.shortcuts import render
from django.shortcuts import HttpResponse
import os
# Create your views here.
from RUA import RUA
import json
#request封装了用户的所有请求
def index(request):
    #request.POST
    #request.GET
    #return HttpResponse("Hello World!")
    result_res = ''
    print(request.method)
    print(request.POST.get("src"))
    if request.method == "POST":
    #     #username = request.POST.get("username")
    #     #password = request.POST.get("password")
    #     #print(username,password)
         with open('contract.sol','w') as f:
             f.write(request.POST.get("src"))
         data = b'abc\ndef'
         print(type(data))
         json_issues = []
         # str_data = data.decode('utf-8')
         # print(data,str_data)
         # data = os.popen('python myth -x /home/silence/mysit/contract.sol').read()
         # s = os.system('python RUA.py -x /home/silence/mysit/contract.sol')
         # print("*&*(&^&$%$%"+str(s))
         # result_res = data.encode('utf-8')
         # print(type(result_res))
         # # print(type(data))
         # data = result_res.decode('utf-8')
         # print(type(data))
         rua = RUA('contract.sol')
         if rua.flag == 1:
             if rua.issues:
                 for issue in rua.issues:
                     print("issue.lineno: "+str(issue.lineno))
                     print("issue.title: "+str(issue.title))
                     print(issue)
                     json_issue = {'title':str(issue.title),
                                   "type":str(issue.type),
                                   "contract":str(issue.contract),
                                   "function":str(issue.function),
                                   "address":str(issue.address),
                                   "description":str(issue.description),
                                   "filename":str(issue.filename),
                                   "lineno":str(issue.lineno),
                                   "code":str(issue.code),
                                   "flag":str(1)}
                     # print(json.dumps(json_issue))
                     json_issues.append(json.dumps(json_issue))
                     json_issues.append(',')
             else:
                 json_issue = {'title': " ",
                               "type": " ",
                               "contract": " ",
                               "function": " ",
                               "address": " ",
                               "description": "The analysis was completed successfully.No issues were detected.",
                               "filename": " ",
                               "lineno": " ",
                               "code": " ",
                               "flag": str(0)}
                 json_issues.append(json.dumps(json_issue))
                 json_issues.append(',')
             # data = data.replace("\n","\r\n")
             # print("^&%^&$^&&*&*(&*(&*"+data)
             # print(json_issues[0].title)
             print(json_issues)
         else:
             json_issue = {'title': " ",
                          "type": " ",
                          "contract": " ",
                          "function": " ",
                          "address": " ",
                          "description": rua.issues,
                          "filename": " ",
                          "lineno": " ",
                          "code": " ",
                          "flag": str(0)}
             json_issues.append(json.dumps(json_issue))
             json_issues.append(',')
    # else: print("555555")
    json_issues=json_issues[:-1]
    return HttpResponse(json_issues)
    #return HttpResponse({"123"})