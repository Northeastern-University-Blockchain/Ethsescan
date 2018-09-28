var $matchedPatternTip = null;
var patternsForLine = {};
var current_progress_delay;
var code_editor_main = null;
var current_id = "";

var update = false;

var contractCodeMap = {};
var codeSourceMap = {};
var contractVulMap = {};
var uploadType = "text";

var currentContract = "myContract";

var isClickEvent = false;

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

var chart_single = {
    'Call data forwarded with delegatecall()':0,
    'Dependence on predictable variable':0,
    'Dependence on predictable environment variable':0,
    'Use of tx.origin':0,
    'Ether send':0,
    'Exception state':0,
    'State change after external call':0,
    'Integer Underflow':0,
    'Integer Overflow':0,
    'DELEGATECALL to a user-supplied address':0,
    'Message call to external contract':0,
    'Multiple Calls':0,
    'Unchecked SUICIDE':0,
    'Transaction order dependence':0,
    'Unchecked CALL return value':0
};

function chart_single_clean() {
    chart_single = {
    'Call data forwarded with delegatecall()':0,
    'Dependence on predictable variable':0,
    'Dependence on predictable environment variable':0,
    'Use of tx.origin':0,
    'Ether send':0,
    'Exception state':0,
    'State change after external call':0,
    'Integer Underflow':0,
    'Integer Overflow':0,
    'DELEGATECALL to a user-supplied address':0,
    'Message call to external contract':0,
    'Multiple Calls':0,
    'Unchecked SUICIDE':0,
    'Transaction order dependence':0,
    'Unchecked CALL return value':0
};

}

function onCodeChange(editor, change) {
    if (!isClickEvent) {
        if (editorClearing) {
            return;
        }

        // setSourceCodeOfContract(currentContract, editor.getValue())
    }
}

function getSourceCodeOfContract(contract) {
    return codeSourceMap[contractCodeMap[contract]["code"]];
}

function setSourceCodeOfContract(contract, src) {
    // alert('line33 contract:'+contract);
    // $("#div_for_iframe").hide();
    if (!(contract in contractCodeMap)) {
        contractCodeMap[contract] = {
            "code": "contract"
        };
    }
    　$.ajax({
                url:"http://127.0.0.1:8000/index/",
                type:"POST",
                data:{
                    src:src
                },
                success:function(data){
                    // alert(data);
                    // alert("["+data+"]");
                    // debugger;
                    json_issues = JSON.parse("["+data+"]");
                    for(var i=0;i<json_issues.length;i++){
                         json_issue = json_issues[i];
                         highlightLine(json_issue.lineno-1,null);
                    }
                    // receiveJSONfromajax(json_issues);
                    // alert(json_issues[0].title);
                    // var data_json = data;
                    var str_HTML = "<tr><th>title</th><th>number</th></tr>";
                    var result_str = '';
                    for(var i=0;i<json_issues.length;i++){
                         chart_single[json_issues[i].title]++;
                         result_str += "==="+json_issues[i].title+"===\r\n";
                         result_str += "Type:"+json_issues[i].type+"\r\n";
                         result_str += "Contract:"+json_issues[i].contract+"\r\n";
                         result_str += "Function name:"+json_issues[i].function+"\r\n";
                         result_str += "PC address:"+json_issues[i].address+"\r\n";
                         result_str += "Description:"+json_issues[i].description+"\r\n";
                         result_str += "Line:"+json_issues[i].lineno+"\r\n";
                    }

                    for(var x in chart_single){
                        if(chart_single[x] > 0)
                            str_HTML+= "<tr style="+getRandomColor()+"><td>"+x.toString()+"</td><td>"+chart_single[x].toString()+"</td></tr>";

                    }
                    // alert(str_HTML);
                    if(json_issues[0].flag == 1){
                        console.log("@@@@@@"+str_HTML);
                        $("#iframe_chart").contents().find("#chartData").html(str_HTML);
                        $("#div_for_iframe").show();
                        $("#iframe_chart")[0].contentWindow.pieChart();
                        // str_HTML = '';
                        // $("#iframe_chart").contents().find("#chartData").html(str_HTML);
                    }
                    // $("#iframe_chart").location.reload();
                    // $("#chartData").html(str_HTML);
                    $("#resultContent").text(result_str);
                    hideLoadingMessage();
                    $("#analyzeResult").css('display', 'block');
                    chart_single_clean();
                    // console.log(data_json);
                }
});
    // alert('line40:'+JSON.stringify(contractCodeMap[contract]["code"]));
     codeSourceMap[contractCodeMap[contract]["code"]] = src;
}

$(window).resize(function () {
    footerCalc();
});

function scrollToElement(id) {
    $('html, body').animate({
        scrollTop: $(id).offset().top
    }, 1000);
}

function showResults() {
    $('#content_analysis').removeClass('hidden');
    $('.contract-audit-section').removeClass('hidden');
    /// removed for testing purposes
    /// scrollToElement("content_analysis");
    /// removed for testing purposes END
}

function hideResults() {
    $('#content_analysis').addClass('hidden');
    $('.contract-audit-section').addClass('hidden');
}

function addActiveToProg(step) {
    var icons = $("#prog_desk").find(".hr-icon");
    var lines = $("#prog_desk").find(".hr-line");

    var icons_m = $("#prog_mob").find(".hr-icon");
    var lines_m = $("#prog_mob").find(".hr-line");

    addActiveToElements(icons, step);
    addActiveToLines(lines, step - 1);
    addActiveToElements(icons_m, step);
    addActiveToLines(lines_m, step - 1);
}

function addActiveToLines(el, step) {
    el.each(function (i) {
        if (i < step) {
            $(this).addClass('active');
        }
    });
}

function addActiveToElements(el, step) {
    el.each(function (i) {
        $(this).removeClass('current-state');
    });
    el.each(function (i) {
        if (i < step - 1) {
            $(this).addClass('active');
        } else if (i === step - 1) {
            $(this).addClass('current-state');
        }
    });
}


function clearContractList() {
    var statusContainer = document.getElementsByClassName('analysis-progress__list')[0];
    // alert('line103 statusContainer:'+statusContainer.innerHTML);
    statusContainer.innerHTML = "";
}

function addToContractList(statuses) {
    var statusContainer = document.getElementsByClassName('analysis-progress__list')[0];

    $.each(statuses, function (key, index) {
        var statusIcon = document.createElement('i');
        var statusIconType;
        if (index.status === 'DONE') {
            statusIconType = 'far fa-file';
        }
        else if (index.status === 'QUEUED') {
            statusIconType = 'far fa-clock';
        }
        else if (index.status === 'CHECKING') {
            statusIconType = 'fas fa-spinner fa-spin';
        }
        else if (index.status === 'ERROR') {
            statusIconType = 'far fa-exclamation';
        }
        if (update === true) {
            updateContractList(index.contract, statusIconType);
        } else {
            statusIcon.className = statusIconType;
            statusIcon.setAttribute('aria-hidden', 'true');
            var statusText = document.createElement('span');
            statusText.innerHTML = index.contract;
            var statusSpan = document.createElement('span');
            statusSpan.id = "contract-item-" + index.contract;
            statusSpan.className = 'progress-list__item';
            var statusWrapper = document.createElement('span');
            statusWrapper.className = 'progress-list__item-wrapper';
            statusWrapper.appendChild(statusIcon);
            statusWrapper.appendChild(statusText);
            statusSpan.appendChild(statusWrapper);
            statusContainer.appendChild(statusSpan);
            statusSpan.onclick = function () {
                isClickEvent = true;
                displayCode(index.contract);
                uploadType = 'text';
                currentContract = index.contract;
                isClickEvent = false;
            };
        }
    });
}

function resetContractsStatusCount() {
    var totalContractsSpan = document.getElementsByClassName('analysis-progress__total')[0];
    var doneContractsSpan = document.getElementsByClassName('analysis-progress__done')[0];
    var initialText = document.getElementsByClassName('analysis-progress__initial')[0];

    totalContractsSpan.innerHTML = "";
    doneContractsSpan.innerHTML = "";
    initialText.innerHTML = "点击按钮扫描合约";
}

function totalContractsStatusCount(statuses) {
    var totalContractsCount = statuses.length;
    var totalContractsSpan = document.getElementsByClassName('analysis-progress__total')[0];
    var initialText = document.getElementsByClassName('analysis-progress__initial')[0];
    totalContractsSpan.innerHTML = "/ " + totalContractsCount + " contracts scanned:";
    initialText.innerHTML = "";
}

function contractsStatusCount(statuses) {
    var contractCounter = 0;
    $.each(statuses, function (key, index) {
        if (index.status === 'DONE') {
            contractCounter++;
        }
    });
    var doneSpan = document.getElementsByClassName('analysis-progress__done')[0];
    doneSpan.innerHTML = contractCounter;
}

function selectContract(event) {
    $(".progress-list__item").removeClass("progress-list__item--active");
    event.addClass("progress-list__item--active");
}

function hideCodeHolder() {
    $('.codeholder').addClass('hidden');
}

function showCodeHolder() {
    $('.codeholder').removeClass('hidden');
    $('.analysis-progress').removeClass('hidden');
    $('.analysis-progress__list').removeClass('hidden');
}

function switchUploadType(event) {
    var clickedButton = event.target.id;
    if (clickedButton === 'upload_files') {
        uploadType = 'zip';
        $('#upload_files').addClass("analze--active");
        $('#clone_git').removeClass("analze--active");
        $('#zipUpload').click();
    } else if (clickedButton === 'clone_git') {
        hideCodeHolder();
        uploadType = 'git';
        $('#clone_git').addClass("analze--active");
        $('#upload_files').removeClass("analze--active");
    } else {
        uploadType = 'text';
        showCodeHolder();
        $('#upload_files').removeClass("analze--active");
        $('#clone_git').removeClass("analze--active");
    }
    if (uploadType !== 'zip') {
        var allTypes = document.getElementsByClassName('upload-type');
        var selectedType = document.getElementById("code-input__" + uploadType);
        for (var i = 0; i < allTypes.length; i++) {
            allTypes[i].style.display = 'none';
        }
        selectedType.style.display = 'block';
    }
}

function footerCalc() {
    var docHeight = $(window).height();
    var footerHeight = $('.footer').height();
    var footerTop = $('.footer').position().top + footerHeight;
    if (footerTop < docHeight) {
        $('.footer').css('margin-top', 10 + (docHeight - footerTop) + 'px');
    } else {
        $('.footer').css('margin-top', '0px');
    }
}


function initialCodeEditor(textAreaName) {
    var code_editor = CodeMirror.fromTextArea(document.getElementById(textAreaName), {
        styleActiveLine: true,
        mode: "text/x-solidity",
        readOnly: false,
        autofocus: true,
        lineNumbers: true,
        gutter: true,
        lineWrapping: true,
        inputStyle: "contenteditable",
    });
    code_editor.setOption("theme", "eclipse");
    code_editor.setOption("styleActiveLine", {nonEmpty: true});
    code_editor.on("activeLineChanged", showMatchedPatternTip);

    return code_editor;
}

function resetMatchedPatternForLine() {
    patternsForLine = {};
}

function addMatchedPatternForLine(line, pattern) {
    if (line in patternsForLine) {
        if (patternsForLine[line].indexOf(pattern) === -1) {
            patternsForLine[line].push(pattern);
        }
    }
    else {
        patternsForLine[line] = [pattern];
    }
}

function showMatchedPatternTip(code, activeLines) {
    $matchedPatternTip.remove();

    if (activeLines.length === 0) {
        return;
    }
    var line = code.getLineNumber(activeLines[0]);

    if (!(line in patternsForLine) || patternsForLine[line].length === 0) {
        return;
    }
    // console.log("showMatchedPatternTip at " + line);

    $matchedPatternTip.find('.matched_pattern_tip_item').hide();

    code.addWidget({ch: 1, line: line}, $matchedPatternTip[0], true);

    for (var i = 0; i < patternsForLine[line].length; ++i) {
        var $item = $matchedPatternTip.find('#matched_pattern_tip-' + patternsForLine[line][i]);
        $item.show();
    }
}

function highlightLine(line, kind) {
    code_editor_main.addLineClass(line, 'background', 'analysis-matched-line');
    addMatchedPatternForLine(line, kind);
}

function displayCode(contract) {
    // hide file inputs
    hideFileInputs();
    // show code viewer
    showCodeHolder();
    code_editor_main.setValue(getSourceCodeOfContract(contract));
    alert("line_304:"+code_editor_main.getValue());
    resetMatchedPatternForLine();

    var code = contractCodeMap[contract]["code"];
    for (var c in contractCodeMap) {
        if (contractCodeMap.hasOwnProperty(c)) {
            if (code === contractCodeMap[c]["code"]) {
                showHighlightedLines(c);
            }
        }
    }

    jumpToCodeLineTop(contractCodeMap[contract]["line"] + 1);
}

function fillVulTable(data) {
    if (current_id !== data.id) {
        return;
    }
    showResults();
    emptyVulTable();

    $.each(contractVulMap, function (contract, vulnerabilities) {
        if ($.isEmptyObject(vulnerabilities)) {
            return;
        }
        for (var kind in vulnerabilities) {
            if (vulnerabilities.hasOwnProperty(kind)) {
                var vuls = vulnerabilities[kind];
                var e = $("#vul_list_" + kind).find(".vullist");
                var type;
                if (vuls.violations) {
                    for (var i = 0; i < vuls.violations.length; i++) {
                        type = "violations";
                        e[0].appendChild(createVulEntry(kind, vuls, contract, i, "violations"));
                    }
                }
                if (vuls.warnings) {
                    for (var i = 0; i < vuls.warnings.length; i++) {
                        type = "warnings";
                        e[0].appendChild(createVulEntry(kind, vuls, contract, i, "warnings"));
                    }
                }
            }
        }
    });

    $('.vullist').each(function () {
        var list = $(this);
        if (list.children().length === 0) {
            list[0].appendChild(createNoIssueElement());
            $(this.parentElement.parentElement).addClass('hidden');
        } else {
            $(this.parentElement.parentElement).removeClass('hidden');
        }
    });

    setCategoryRiskCount();
}

function createNoIssueElement() {
    var p = document.createElement("p");
    p.className += 'penal-item';
    p.innerHTML = 'No issues found';
    return p;
}


function setCategoryRiskCount() {
    var vulCounterHolder = [];
    var vulTotalCounterHolder = 0;
    var totalTRCount = 0;
    var totalRCCount = 0;
    var totalICPCount = 0;
    var totalUEFCount = 0;
    var totalDOUICount = 0;
    var vulCounter;
    $.each(contractVulMap, function (contract, vulnerabilities) {
        if ($.isEmptyObject(vulnerabilities)) {
            return;
        }
        // console.log(contract);
        vulCounter = 0;
        vulCounterHolder = [];
        $.each(vulnerabilities, function (vulName, vuls) {
            vulCounter = 0;
            if (vuls['violations']) {
                var vulCount = vuls['violations'].length;
                if (!isNaN(vulCount)) {
                    vulCounter += vulCount;
                    vulCount = 0;
                }
            }
            if (vuls['warnings']) {
                var vulCount = vuls['warnings'].length;
                if (!isNaN(vulCount)) {
                    vulCounter += vulCount;
                    vulCount = 0;
                }
            }
            vulCounterHolder.push(vulCounter);
            vulTotalCounterHolder += vulCounter;
        });
        totalTRCount += vulCounterHolder[8] + vulCounterHolder[9] + vulCounterHolder[10];
        totalRCCount += vulCounterHolder[0] + vulCounterHolder[1] + vulCounterHolder[2];
        totalICPCount += vulCounterHolder[14] + vulCounterHolder[11] + vulCounterHolder[5] + vulCounterHolder[4] + vulCounterHolder[12] + vulCounterHolder[7] + vulCounterHolder[17];
        totalUEFCount += vulCounterHolder[13] + vulCounterHolder[6];
        totalDOUICount += vulCounterHolder[15] + vulCounterHolder[16] + vulCounterHolder[3];
    });
    var transactionReorderingCount = document.getElementsByClassName("transaction-reordering-count")[0];
    var recursiveCallsCount = document.getElementsByClassName("recursive-calls-count")[0];
    var insecureCodingPatternsCount = document.getElementsByClassName("insecure-coding-pattern-count")[0];
    var unexpectedEtherFlowsCount = document.getElementsByClassName("unexpected-ether-flows-count")[0];
    var dependanceOnUnsafeInputsCount = document.getElementsByClassName("dependance-on-unsafe-inputs-count")[0];

    renderCategory(transactionReorderingCount, totalTRCount);
    renderCategory(recursiveCallsCount, totalRCCount);
    renderCategory(insecureCodingPatternsCount, totalICPCount);
    renderCategory(unexpectedEtherFlowsCount, totalUEFCount);
    renderCategory(dependanceOnUnsafeInputsCount, totalDOUICount);

    var totalCount = document.getElementsByClassName("total-issue-count")[0];
    totalCount.innerHTML = vulTotalCounterHolder;
    if (vulTotalCounterHolder !== 0) {
        $("#no-issues-found-container").addClass('hidden');
        $("#issues-found-container").removeClass('hidden');
    } else {
        $("#no-issues-found-container").removeClass('hidden');
        $("#issues-found-container").addClass('hidden');
    }
}

function renderCategory(countElement, count) {
    if (count === 0) {
        $(countElement.parentElement).addClass('hidden');
    } else {
        $(countElement.parentElement).removeClass('hidden');
        countElement.innerHTML = count;
    }
}

function emptyVulTable() {
    var counts = $('.vulcount');
    for (var i = 0; i < counts.length; ++i) {
        counts[i].innerHTML = "0";
    }
    var vullists = $(".vullist");
    for (i = 0; i < vullists.length; ++i) {
        while (vullists[i].children.length !== 0) {
            vullists[i].removeChild(vullists[i].firstChild)
        }
    }
}

function createVulEntry(kind, vuls, contract, index, type) {

    var p = document.createElement("p");
    p.className += 'penal-item';

    var coloredSquare = document.createElement('span');
    coloredSquare.className = 'report__colored-square--' + type;

    var line = vuls[type][index];

    var a = document.createElement("a");
    a.className += "line";
    a.href = "javascript:void(0)";
    a.innerHTML = contract + ": " + line;
    a.onclick = function (e) {
        e.preventDefault();
        // console.log("line function");
        isClickEvent = true;
        selectContract($("#contract-item-" + contract));
        displayCode(contract);
        jumpToCodeLine(line);
        scrollToCodeEditor();
        isClickEvent = false;
    };

    p.appendChild(coloredSquare);
    p.appendChild(a);
    return p;
}

function showThankYouModal() {
    $('#feedback-form').modal('hide');
    $('#feedback-response').modal('show');
}

function showThankYouNewsModal() {
    $('#modal-news').modal('hide');
    $('#modal-news-ty').modal('show');
}

function sendFeedback() {
    var es = document.getElementById("fb-form").elements;

    $.ajax({
        url: 'feedback/',
        data: {
            "name": es[0].value,
            "email": es[1].value,
            "comment": es[2].value
        },
        type: 'POST',
        dataType: "json",
        success: function (msg) {
            showThankYouModal();
        },
    });
}

function subscribeMaillist() {
    var e = document.getElementById("email_news");

    $.ajax({
        url: 'maillist/',
        data: {
            "mail": e.value,
        },
        type: 'POST',
        dataType: "json",
        success: function (msg) {
            showThankYouNewsModal();
        },
    });
}

function jumpToCodeLineTop(line) {
    var t = code_editor_main.charCoords({line: line, ch: 0}, "local").top;
    code_editor_main.scrollTo(null, t);
    code_editor_main.setCursor(line - 1, 0);
}

function jumpToCodeLine(line) {
    var t = code_editor_main.charCoords({line: line, ch: 0}, "local").top;
    var middleHeight = code_editor_main.getScrollerElement().offsetHeight / 2;
    code_editor_main.scrollTo(null, t - middleHeight - 5);
    code_editor_main.setCursor(line - 1, 0);

}

function scrollToCodeEditor() {
    var codeholder = $('.codeholder');
    $('html,body').animate({
        scrollTop: codeholder.offset().top - ($(window).height() - codeholder.outerHeight(true)) / 2
    }, 200);
}

function hideFileInputs() {
    $('#code-input__git').css('display', 'none');
    $('#code-input__zip').css('display', 'none');
}

function showLoadingMessage() {
    var btn = document.getElementById("run_btn");
    btn.disabled = true;
    btn.innerHTML = '<span>分析中...</span><i class="fa fa-spinner fa-spin loading__spinner" aria-hidden="true"></i>'
}

function hideLoadingMessage() {
    var btn = document.getElementById("run_btn");
    btn.disabled = false;
    //btn btn_light_blue btn-default z-index10
    btn.innerHTML = "开始检测";
}

function analyze() {
    contractCodeMap = {};
    contractVulMap = {};
    showLoadingMessage();
    hideError();
    var formdata;
    if (uploadType === "text") {
        //1.用一些键值对来模拟一系列表单控件：即把form中所有表单元素的name与value组装成一个queryString
        //2.异步上传二进制文件。
        formdata = new FormData();
        setSourceCodeOfContract(currentContract, code_editor_main.getValue());
        formdata.append("contracts", JSON.stringify(codeSourceMap));
        formdata.append("type", "files");
        contractCodeMap = {};
    } else if (uploadType === "git") {
        formdata = new FormData();
        formdata.append("url", $("#git_url")[0].value);
        formdata.append("type", "git");
        clearEditor();
    } else {
        var f = $('.file-upload-form').get(0);
        formdata = new FormData(f);
        formdata.append("type", uploadType);
        clearEditor();
    }
     //upload(formdata);
    uploadType = "text";
}

function saveCode(response) {
    if (current_id !== response["id"]) {
        return;
    }
    contractCodeMap = response["contracts"];
    codeSourceMap = response["sources"];
    currentContract = Object.keys(contractCodeMap)[0];
    displayCode(currentContract);
}

function showContractList() {
    $(".contract-list").removeClass("hidden");
}

function populateContractList(data) {
    if (current_id !== data.id) {
        return;
    }
    if (data.loading) {
        return;
    }
    if (update === false) {
        clearContractList();
    }
    $(".analysis-progress__list").removeClass("hidden");
    showContractList();
    addToContractList(data.statuses);
    totalContractsStatusCount(data.statuses);
    contractsStatusCount(data.statuses);
    update = true;
}

function progressCallBack(data) {
    if (current_id !== data.id) {
        return;
    }
    var allContractsAnalyzed = true;
    if (data.loading) {
        allContractsAnalyzed = false;
    } else {
        if ($.isEmptyObject(contractCodeMap)) {
            getCode(data.id);
        }
        for (var i = 0; i < data.statuses.length; i++) {
            var status = data.statuses[i].status;
            if (status === "QUEUED" || status === "CHECKING") {
                allContractsAnalyzed = false;
            } else if (status === "DONE" && !(data.statuses[i].contract in contractVulMap)) {
                getAnalysis(data.id, data.statuses[i].contract)
            }
        }
    }
    if (!allContractsAnalyzed) {
        setTimeout(function () {
            window.setTimeout(function () {
                progressCheck(data.id);
            }, current_delay);
            current_progress_delay *= 1.05;
        });
    } else {
        hideLoadingMessage();
    }
}

var editorClearing = false;

function clearEditor() {
    editorClearing = true;
    code_editor_main.setValue("");
    code_editor_main.refresh();
    editorClearing = false;
}

function saveAnalysis(data) {
    if (current_id !== data.id) {
        return;
    }

    contractVulMap[data["contract"]] = data["patterns"];
    var list = $('.progress-list__item--active');
    if (list.length === 0) {
        var list_inactive = $('.progress-list__item');
        list_inactive[0].click();
    }
}

function showHighlightedLines(contract) {
    var vulnerabilities = contractVulMap[contract];
    $.each(vulnerabilities, function (vulnerability, types) {
        if (types['violations'] && types['violations'].length >= 1) {
            types['violations'].forEach(function (violationLine) {
                highlightLine(violationLine - 1, vulnerability);
            })
        }
        if (types['warnings'] && types['warnings'].length >= 1) {
            types['warnings'].forEach(function (violationLine) {
                highlightLine(violationLine - 1, vulnerability);
            })
        }
    })
}

function updateCurrentContract(data) {
    if (current_id !== data.id) {
        return;
    }
    displayCode(currentContract);
}

function hideError() {
    $('.upload-error').css('display', 'none');
}


function showError(e) {
    hideLoadingMessage();
    if (e.statusText === "abort") {
        return;
    }
    hideResults();
    var errorDiv = $('.upload-error');
    errorDiv.css('display', 'block');
    var errorTitle = $('.upload-error__title')[0];
    var errorMsg = $('.upload-error__message')[0];
    var errorInfo = $('.upload-error__info');
    var errorInfoTa = $('.upload-error__info textarea')[0];
    errorTitle.innerHTML = "An error occured:";
    if ("responseJSON" in e) {
        hideResults();
        errorMsg.innerHTML = e.responseJSON["error"]["msg"];
        var infoTxt = e.responseJSON["error"]["info"];
        if (infoTxt !== "") {
            errorInfoTa.value = infoTxt;
            errorInfo.removeClass("hidden");
        } else {
            errorInfo.addClass("hidden");
        }
    } else {
        errorMsg.innerHTML = "Status text: " + e.statusText;
    }
}

function idUpdater(id) {
    current_id = id
}

function renderStats(stats) {
    $('#contractsCount')[0].innerHTML = stats["contractCount"];
    $('#issuesCount')[0].innerHTML = stats["issueCount"];
}

var codeEditorsDialog = [];

function setupCodeMirrorDialog() {
    var $dialog = $('.modal-dialog');
    $dialog.find('.modal-code-area').each(function () {
        var textarea = $(this).find('textarea')[0];
        var codeDialog = CodeMirror.fromTextArea(textarea, {
            mode: "text/x-solidity",
            gutter: true,
            lineWrapping: true,
            inputStyle: "contenteditable",
            readOnly: true,
            lineNumbers: true,

        });
        codeDialog.setOption("theme", "eclipse");


        var lines = this.dataset.lines.split(",");
        for (var i = 0; i < lines.length; i++) {
            var line = parseInt(lines[i]);
            codeDialog.addLineClass(line - 1, 'background', 'analysis-matched-line');
        }

        codeEditorsDialog.push(codeDialog);
    });
}

function initSocialShare() {
    var linkedIn = $.param({
        "url": "https://securify.ch",
        "mini": true,
        "title": "Release of the new version of Securify, the popular security scanner for Ethereum smart contracts!",
        "summary": "New security scanner for Ethereum smart contracts: Aims to secure every blockchain project for free!",
    });
    // document.getElementById("linked-in-share").href = "https://www.linkedin.com/shareArticle?" + linkedIn;

    var twitter = $.param({
        "url": "https://securify.ch",
        "text": "Release of the new version of Securify, the popular security scanner for Ethereum smart contracts!\n",
        "hashtags": "EthereumSecurity",
        "via": "Chain_Security"
    });
    // document.getElementById("twitter-share").href = "https://twitter.com/intent/tweet?" + twitter;

    var reddit = $.param({
        "url": "https://securify.ch",
        "title": "Release of the new version of Securify, the popular security scanner for Ethereum smart contracts!",
    });
    // document.getElementById("reddit-share").href = "https://reddit.com/submit?" + reddit;

    var telegram = $.param({
        "url": "https://securify.ch",
        "text": "Release of the new version of Securify, the popular security scanner for Ethereum smart contracts!",
    });
    // document.getElementById("telegram-share").href = "https://telegram.me/share/url?" + telegram;

    var facebook = $.param({
        "u": "https://securify.ch",
    });
    // document.getElementById("facebook-share").href = "https://www.facebook.com/sharer/sharer.php?" + facebook;
}

function initSecurify() {
    getStatsObservers.push(renderStats);
    uploadObservers.push(idUpdater, progressCheck);
    getCodeObservers.push(saveCode);
    progressObservers.push(progressCallBack, populateContractList);
    getAnalysisObservers.push(saveAnalysis, fillVulTable, updateCurrentContract);

    progressErrorObservers.push(showError);
    uploadErrorObservers.push(showError);

    getStats();

    footerCalc();
    setupCodeMirrorDialog();
    code_editor_main = initialCodeEditor("code-main");
    code_editor_main.on("change", onCodeChange);
    //hide the iframe
    $("#div_for_iframe").hide();

    $('#zipUpload').on("change", function () {
        $('#run_btn').click();
    });

    $('#git_url').on('keydown', function (event) {
        if (event.which == 13) {
            event.preventDefault();
            $('#run_btn').click();
        }
    })

    $('#learn-more-btn').click(function (e) {
        e.preventDefault();
        scrollToElement(".learn-more-section");
    });

    $('#run_btn').click(function (e) {
        e.preventDefault();
        //$("#iframe_chart").contents().find("#chartData").html('');
        $("#div_for_iframe").hide();

        update = false;
        clearContractList();
        resetContractsStatusCount();

        abortLastAjax();
        analyze();

        $('#content_analysis_code').removeClass('hidden');
        showCodeHolder();
        hideFileInputs();
        hideResults();
        footerCalc();
        code_editor_main.refresh();
        scrollToElement('.input-container')
    });
    $('#paste_code, #upload_files, #clone_git').click(function (e) {
        hideError();
        switchUploadType(e);
    });
    $('body').on('click', '.progress-list__item', function (e) {
        var event = $(this);
        selectContract(event);
    });
    $('.file-upload-form input').change(function () {
        var fileMessage;
        if (this.files.length === 0) {
            fileMessage = "Click to upload File or Drag & Drop here";
        }
        else if (this.files.length === 1) {
            fileMessage = "file \'" + this.files[0].name + "\' selected";
        }
        else {
            fileMessage = this.files.length + " files selected";
        }
        $('.file-upload-form p span').text(fileMessage);
    });
    $(document).on('shown.bs.modal', function () {
        setTimeout(function () {
            for (var i = 0; i < codeEditorsDialog.length; i++) {
                codeEditorsDialog[i].refresh();
            }
        }, 1);
    });

    $matchedPatternTip = $('#matched_pattern_tip');
    $matchedPatternTip.remove();

    $(document).on('shown.bs.modal', function () {
        setTimeout(function () {
            for (var i = 0; i < codeEditorsDialog.length; i++) {
                codeEditorsDialog[i].refresh();
            }
        }, 1);
    });
    $(document).ready(function () {
        $('[data-toggle="tooltip"]').tooltip();
    });
    $('#fb-form').submit(function () {
        sendFeedback();
        return false;
    });
    $('#submit-sign-up').click(subscribeMaillist);
    initSocialShare();
}

$(function () {
    initSecurify();
});

function updateContractList(contractName, statusIconType) {
    var contractList = $('.analysis-progress__list').children();
    var spanList = contractList.children().find('span:even');
    var spanListArray = Array.prototype.slice.call(spanList);
    spanListArray.forEach(function (span) {
        if (span.innerHTML === contractName) {
            var icon = span.parentElement.getElementsByTagName('i');
            icon[0].classList = "";
            icon[0].className = statusIconType;
        }
    });
}
var getRandomColor = function(){
  return  'color:#' +
    (function(color){
    return (color +=  '0123456789abcdef'[Math.floor(Math.random()*16)])
      && (color.length == 6) ?  color : arguments.callee(color);
  })('');
}