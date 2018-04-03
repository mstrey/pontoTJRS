// ==UserScript==
// @name         Ponto Eletrônico TJRS
// @namespace    http://tampermonkey.net/
// @supportURL   https://github.com/mstrey/pontoTJRS/issues
// @version      1.0
// @description  script para calcular ponto eletrônico do TJRS
// @author       mstrey
// @match        https://www.tjrs.jus.br/novo/servicos/gestao-de-pessoas/ponto-eletronico/
// @grant        none
// ==/UserScript==
// todo-list:
// incluir o saldo final em uma linha de tabela no final da tabela

var saldoPeriodo = 0;

function setFields(){
    document.getElementById("ponto-eletronico-search-txtmat").value = "3821838";// altere pelo seu número de matrícula
    $('#ponto-eletronico-search-dtini').datepicker( 'setDate', getFirstDayOfMonth(new Date()) );
    $('#ponto-eletronico-search-dtfim').datepicker( 'setDate', getLastDayOfMonth(new Date()) );

    $('#ponto-eletronico-search-btnconsultar').click(function(event) {
        if ($('#ponto-eletronico-search').valid()) {
            saldoPeriodo = 0;

            var matricula = $('#ponto-eletronico-search-txtmat').val();
            var dataIni = $('#ponto-eletronico-search-dtini').val();
            var dataFim = $('#ponto-eletronico-search-dtfim').val();

            jQuery.post(
                FRMAjax.ajaxurl,
                {
                    'action': 'pontoEletronicoAjaxGetResult',
                    'matricula': matricula,
                    'dataInicial': dataIni,
                    'dataFinal': dataFim
                },
                function(response) {
                    $('#ponto-eletronico-result').html(calculaSaldos(response));
                }
            );

        }
    });

    $('#ponto-eletronico-search-btnconsultar').click();
}

function calculaSaldos(ajax){
    var htmlObject = createElement("div",{},"");
    htmlObject.innerHTML = ajax;

    Array.from(htmlObject.getElementsByClassName("odd/even")).forEach(
        function(element, index, array) {
            var tdList = element.getElementsByTagName('td');
            var tdDate = tdList[0];
            var date = tdDate.innerText;

            for(i=1;i<=4;i++){
                var td = element.getElementsByTagName('td')[i];
                td.id = date+"-"+i;
            }
            var txtSaldo = atualizaSaldo(tdList);
            var tdSaldo = createElement("td",{},"");
            tdSaldo.appendChild(txtSaldo);
            element.appendChild(tdSaldo);
        }
    );
    var txtSaldoPeriodo = createElement("text",{},numToHora(saldoPeriodo));
    if(saldoPeriodo < 0){
        txtSaldoPeriodo.style.color="red";
    } else {
        txtSaldoPeriodo.style.color="blue";
    }
    txtSaldoPeriodo.style.fontWeight="bold";

    htmlObject.appendChild(txtSaldoPeriodo);
    return htmlObject;
}

function atualizaSaldo(linhaHora){

    var dia = linhaHora[0].innerText;

    var min0830 = (8*60)+30;
    var min1730 = 17*60+30;

    if(linhaHora[1].innerText.trim() == ""){
        linhaHora[1].innerText = "08:30";
        linhaHora[1].style.color="red";
        linhaHora[1].style.fontWeight="bold";
    }

    if(linhaHora[2].innerText.trim() == ""){
        linhaHora[2].innerText = "12:00";
        linhaHora[2].style.color="red";
        linhaHora[2].style.fontWeight="bold";
    }

    if(linhaHora[3].innerText.trim() == ""){
        linhaHora[3].innerText = "13:00";
        linhaHora[3].style.color="red";
        linhaHora[3].style.fontWeight="bold";
    }

    if(linhaHora[4].innerText.trim() == ""){
        var hrSugest = "17:30";
        if(saldoPeriodo < 0){
            hrSugest = numToHora(min1730+(-saldoPeriodo));
            saldoPeriodo = 0;
        }

        linhaHora[4].innerText = hrSugest;
        linhaHora[4].style.color="red";
        linhaHora[4].style.fontWeight="bold";
    }

    var pt1 = linhaHora[1].innerText.trim();
    var pt2 = linhaHora[2].innerText.trim();
    var pt3 = linhaHora[3].innerText.trim();
    var pt4 = linhaHora[4].innerText.trim();

    var manha = diffHora(pt1,pt2);
    var tarde = diffHora(pt3,pt4);
    var almoco = diffHora(pt2,pt3);

    var saldoDia = (manha + tarde) - (8*60);
    if(almoco <= 60 && almoco >= 50){
        saldoDia += almoco-60;
        console.log("almoco1: "+almoco+" / saldoDia: "+saldoDia);
    } else if(almoco <= 70 && almoco >= 60){
        saldoDia -= 60-almoco;
        console.log("almoco2: "+almoco+" / saldoDia: "+saldoDia);
    } else if(almoco < 50 && (manha + tarde > (8*60))){
        console.log("almoco3: "+almoco+" / saldoDia: "+saldoDia);
        if(almoco > saldoDia){
            saldoDia = 0;
        } else {
            saldoDia = saldoDia - (60-almoco);
        }
    }

    saldoPeriodo += saldoDia;
    console.log(dia+" : "+numToHora(manha)+" / "+numToHora(tarde)+" / "+numToHora(almoco)+" / "+numToHora(saldoDia)+" -> "+numToHora((saldoPeriodo)));
    var hrSaldoDia = numToHora(saldoDia);
    var txtHr = createElement("text",{"id":dia+"-"+"5"},hrSaldoDia);

    if(saldoDia < 0){
        txtHr.style.color="red";
    } else {
        txtHr.style.color="blue";
    }

    txtHr.style.fontWeight="bold";

    return txtHr;
}

function getLastDayOfMonth(dt) {
    var result = new Date(dt.getFullYear(), dt.getMonth()+1, 0);
    return result;
}

document.addEventListener("DOMContentLoaded", setFields());

function pegaHora(td){
    td.innerText.trim();
}
function createElement(element,attribute,inner){
    if(typeof(element) === "undefined"){return false;}

    if(typeof(inner) === "undefined"){inner = "";}

    var el = document.createElement(element);

    if(typeof(attribute) === 'object'){
        for(var key in attribute){
            el.setAttribute(key,attribute[key]);
        }
    }

    if(!Array.isArray(inner)){inner = [inner];}

    for(var k = 0;k < inner.length;k++){
        if(inner[k].tagName){
            el.appendChild(inner[k]);
        }else{
            el.appendChild(document.createTextNode(inner[k]));
        }
    }
    return el;
}

function diffHora(hora1, hora2) {
    var data1 = ("2018-01-01T"+hora1.trim());
    var data2 = ("2018-01-01T"+hora2.trim());

    var minutes = ((new Date(data2)) - (new Date(data1))) / (60000);

    return minutes > -60 ? minutes : (4*60);
}

function numToHora(minutos) {
    var h = ("0" + parseInt(minutos/60)).slice(-2);
    var m = ("0" + Math.abs((minutos-(h*60)))).slice(-2);

    return h+":"+m;
}


