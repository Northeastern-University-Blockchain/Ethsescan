var json_issues = [{
    'title':null,
    "type":null,
    "contract":null,
    "function":null,
    "address":null,
    "description":null,
    "filename":null,
    "lineno":null,
    "code":null,
    "flag":null
 }];
var json_issue = {
    'title':null,
    "type":null,
    "contract":null,
    "function":null,
    "address":null,
    "description":null,
    "filename":null,
    "lineno":null,
    "code":null,
    "flag":null
 };
$(function() {// 初始化内容
     $("#chartData").html("<table id=\"chartData\"><tbody><tr><th>title</th><th>number</th></tr><tr><td>Message call to external contract</td><td>1</td></tr><tr><td>Message call to external contract</td><td>1</td></tr><tr><td>State change after external call</td><td>1</td></tr><tr><td>Message call to external contract</td><td>1</td></tr><tr><td>Message call to external contract</td><td>1</td></tr><tr><td>Transaction order dependence</td><td>1</td></tr><tr><td>Unchecked CALL return value</td><td>1</td></tr><tr><td>Unchecked CALL return value</td><td>1</td></tr><tr><td>Unchecked CALL return value</td><td>1</td></tr><tr><td>Unchecked CALL return value</td><td>1</td></tr></tbody></table>");
     pieChart();
});
// function receiveJSONfromajax(json_issues){
//     json_issues = json_issues;
//     var json_issue;
//     var str_HTML = "<tr><th>title</th><th>number</th></tr>";
//     for(var i=0;i<json_issues.length;i++){
//         json_issue = json_issues[i];
//
//            str_HTML+= "<tr><th>"+json_issue.title+"</th><th>1</th></tr>";
//
//     }
//     // alert(str_HTML);
//     $("#chartData").html(str_HTML);
//     alert($("#chartData").html());
// }