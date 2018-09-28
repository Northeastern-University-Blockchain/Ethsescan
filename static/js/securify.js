var last_ajax = null;

var getAnalysisObservers = [];
var progressObservers = [];
var uploadObservers = [];
var getCodeObservers = [];
var getStatsObservers = [];

var getAnalysisErrorObservers = [];
var progressErrorObservers = [];
var uploadErrorObservers = [];
var getCodeErrorObservers = [];
var getStatsErrorObservers = [];

var resultsReceived = [];

function abortLastAjax() {
    if (last_ajax) {
        var la = last_ajax;
        last_ajax = null;
        //终止请求
        la.abort();
    }
}

function uploadCodes(event) {
    var formdata = new FormData(this);
    var text = $('textarea#txt').val();

    upload(formdata);
    event.preventDefault();
}

function getStats() {
    $.ajax({
        url: 'statistics',
        type: 'GET',
        success: function (rsp) {
            for (var i = 0; i < getStatsObservers.length; i++) {
                getStatsObservers[i](rsp);
            }
        },
        error: function (rsp) {
            for (var i = 0; i < getStatsErrorObservers.length; i++) {
                getStatsErrorObservers[i](rsp);
            }
        },
    });
}


function getAnalysis(fp, contract) {
    var url = 'analysis/' + fp + "/" + contract;
    $.ajax({
        url: url,
        type: 'GET',
        success: function (rsp) {
            for (var i = 0; i < getAnalysisObservers.length; i++) {
                getAnalysisObservers[i](rsp);
            }
        },
        error: function (rsp) {
            for (var i = 0; i < getAnalysisErrorObservers.length; i++) {
                getAnalysisErrorObservers[i](rsp);
            }
        },
    });
}

function getCode(fp) {
    var url = 'code/' + fp;
    $.ajax({
        url: url,
        type: 'GET',
        success: function (rsp) {
            for (var i = 0; i < getCodeObservers.length; i++) {
                getCodeObservers[i](rsp);
            }
        },
        error: function (rsp) {
            for (var i = 0; i < getCodeErrorObservers.length; i++) {
                getCodeErrorObservers[i](rsp);
            }
        },
    });
}

function progressCheck(fp) {
    abortLastAjax();
    var url = 'status/' + fp;
    last_ajax = $.ajax({
        url: url,
        type: 'GET',
        success: function (rsp) {
            for (var i = 0; i < progressObservers.length; i++) {
                progressObservers[i](rsp);
            }
        },
        error: function (rsp) {
            if (!last_ajax) {
                abortLastAjax()
            }
            for (var i = 0; i < progressErrorObservers.length; i++) {
                progressErrorObservers[i](rsp);
            }
        },
    });
}

function upload(data) {
    resultsReceived = [];
    $.ajax({
        url: "analysis",
        type: "POST",
        data: data,
        processData: false,
        contentType: false,
        success: function (rsp) {
            current_delay = 500;
            for (var i = 0; i < uploadObservers.length; i++) {
                uploadObservers[i](rsp["id"]);
            }
        },
        error: function (rsp) {
            current_delay = 500;
            for (var i = 0; i < uploadErrorObservers.length; i++) {
                uploadErrorObservers[i](rsp);
            }
            // progressCheck(rsp["id"], progressCallBack);
        }
    });
}
