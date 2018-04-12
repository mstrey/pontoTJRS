// ==UserScript==
// @name         Ponto Eletrônico TJRS
// @namespace    http://tampermonkey.net/
// @supportURL   https://github.com/mstrey/pontoTJRS/issues
// @version      1.3.2
// @description  script para calcular ponto eletrônico do TJRS
// @author       mstrey
// @match        https://www.tjrs.jus.br/novo/servicos/gestao-de-pessoas/ponto-eletronico/
// @grant        none
// ==/UserScript==

var saldoPeriodo = 0;
var entradaSugerida = "09:00";
var almIniSugerido = "12:00";
var almFimSugerido = "13:00";
var saidaSugerida = "18:00";

var usuariosHabilitados = new Map();
usuariosHabilitados.set('mstrey@tj.rs.gov.br','3821838');
usuariosHabilitados.set('pablo@tj.rs.gov.br','3672808');
usuariosHabilitados.set('rpbonfantti@tj.rs.gov.br','3477797');

function setFields(){

    $('#ponto-eletronico-search-dtini').datepicker( 'setDate', getFirstDayOfMonth(new Date()) );
    $('#ponto-eletronico-search-dtfim').datepicker( 'setDate', getLastDayOfMonth(new Date()) );

    $('#ponto-eletronico-search-btnconsultar').click(function(event) {
        var email = document.getElementsByClassName("list-group-user")[0].childNodes[3].innerText.trim();
        var matricula = usuariosHabilitados.get(email);
        document.getElementById("ponto-eletronico-search-txtmat").value = matricula;

        if ($('#ponto-eletronico-search').valid()) {
            saldoPeriodo = 0;

            matricula = $('#ponto-eletronico-search-txtmat').val();
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
                    try{
                        $('#ponto-eletronico-result').html(calculaSaldos(response));
                    }catch(e){
                        $('#ponto-eletronico-result').html(response);
                    }
                }
            );

        }
    });

//    $('#ponto-eletronico-search-btnconsultar').click();
}

function calculaSaldos(ajax){
    var htmlObject = createElement("div",{},"");
    htmlObject.innerHTML = ajax;
    var listaDias = htmlObject.getElementsByClassName("odd/even");
    Array.from(listaDias).forEach(
        function(element, index, array) {
            var date = element.getElementsByTagName('td')[0].innerText;

            for(i=1;i<=element.lenght;i++){
                var td = element.getElementsByTagName('td')[i];
                td.id = date+"-"+i;
            }
            var txtSaldo;
            try {
                txtSaldo = atualizaSaldo(element);
            } catch(e){
                alert(e);
                throw BreakException;
            }

            addColuna(element, txtSaldo);
        }
    );

    var txtSaldoPeriodo = createElement("text",{},numToHora(saldoPeriodo));
    if(saldoPeriodo < 0){
        txtSaldoPeriodo.style.color="red";
    } else {
        txtSaldoPeriodo.style.color="blue";
    }
    txtSaldoPeriodo.style.fontWeight="bold";

    var tdSaldo = createElement("td",{},"");
    tdSaldo.appendChild(txtSaldoPeriodo);

    listaDias[0].parentNode.insertRow();
    var trSaldo = listaDias[0].parentNode.lastChild;
    trSaldo.insertCell().innerText = "";
    trSaldo.insertCell().innerText = "";
    trSaldo.insertCell().innerText = "";
    trSaldo.insertCell().innerText = "";
    trSaldo.insertCell().innerText = "Saldo final período:";
    trSaldo.appendChild(tdSaldo);

//    htmlObject.appendChild(trSaldo);
    return htmlObject;
}

function atualizaSaldo(linhaDOM){

    var linhaHora = linhaDOM.getElementsByTagName('td');

    var dia = linhaHora[0].innerText.trim();

    if(linhaHora.length > 5){
        throw "Muitos registros no dia "+dia+". Atualizacao de saldos abortada.";
    }

    var entrada = linhaHora[1].innerText.trim();
    if (linhaHora[2] == null) { addColuna(linhaDOM, ""); }
    if (linhaHora[3] == null) { addColuna(linhaDOM, ""); }
    if (linhaHora[4] == null) { addColuna(linhaDOM, ""); }
    var almIni = linhaHora[2].innerText.trim();
    var almFim = linhaHora[3].innerText.trim();
    var saida = linhaHora[4].innerText.trim();

    if(horaToNum(entrada) > (11*60)){
        saida = almFim;
        almFim = almIni;
        almIni = entrada;
        entrada = entradaSugerida;
        linhaHora[1].innerText = entradaSugerida;
        linhaHora[1].style.color="red";
        linhaHora[1].style.fontWeight="bold";
    }

    linhaHora[2].innerText = almIni;
    linhaHora[3].innerText = almFim;
    linhaHora[4].innerText = saida;

    var sugereSaida = false;

    if(linhaHora[1].innerText.trim() == ""){
        linhaHora[1].innerText = entradaSugerida;
        linhaHora[1].style.color="red";
        linhaHora[1].style.fontWeight="bold";
    }

    if(linhaHora[2].innerText.trim() == ""){
        linhaHora[2].innerText = almIniSugerido;
        linhaHora[2].style.color="red";
        linhaHora[2].style.fontWeight="bold";
    }

    if(linhaHora[3].innerText.trim() == ""){
        linhaHora[3].innerText = almFimSugerido;
        linhaHora[3].style.color="red";
        linhaHora[3].style.fontWeight="bold";
    }

    if(linhaHora[4].innerText.trim() == ""){
        sugereSaida = true;
        linhaHora[4].innerText = saidaSugerida;
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
    } else if(almoco <= 70 && almoco >= 60){
        saldoDia -= 60-almoco;
    } else if(almoco < 50 && ((manha + tarde) > (8*60))){
        saldoDia = saldoDia-(60-almoco);
        if(saldoDia < 0) {
            saldoDia = 0;
        }
    }

    saldoPeriodo += saldoDia;

    if(sugereSaida && saldoPeriodo < 0){
        linhaHora[4].innerText = numToHora(horaToNum(saidaSugerida)-saldoPeriodo);
        saldoDia = 0;
        saldoPeriodo = 0;
    }

    var hrSaldoDia = numToHora(saldoDia);
    var txtHr = createElement("text",{"id":dia+"-"+"5"},hrSaldoDia);

    if(saldoDia < 0){
        txtHr.style.color="red";
    } else if(saldoDia > 0){
        txtHr.style.color="blue";
    }

    txtHr.style.fontWeight="bold";

    return txtHr;
}

function getLastDayOfMonth(dt) {
    var result = new Date(dt.getFullYear(), dt.getMonth()+1, 0);
    return result;
}

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

function horaToNum(hora) {
    var minutos = parseInt(hora.substring(3,5));
    minutos += parseInt(hora.substring(0,2))*60;

    return minutos;
}

function addColuna(linha, texto) {
    var txt = createElement("text",{},texto);
    var td = createElement("td",{},"");
    td.appendChild(txt);
    linha.appendChild(td);
}

$(document).ready(setFields());
