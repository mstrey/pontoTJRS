// ==UserScript==
// @name         Ponto Eletr�nico TJRS (DEV)
// @namespace    http://tampermonkey.net/
// @supportURL   https://github.com/mstrey/pontoTJRS/issues
// @version      1.6.1
// @description  script para calcular ponto eletr�nico do TJRS
// @author       mstrey
// @match        https://www.tjrs.jus.br/novo/servicos/gestao-de-pessoas/ponto-eletronico/
// @grant        none
//
// ==/UserScript==

var matricula;
var saldoPeriodo = 0;
var entradaSugerida = "09:00";
var almIniSugerido = "12:00";
var almFimSugerido = "13:00";
var saidaSugerida = "18:00";

function setFields(){

    if (typeof(Storage) !== "undefined") {
        document.getElementById("ponto-eletronico-search-txtmat").value = localStorage.getItem("matricula");
        matricula = localStorage.getItem("matricula");
    }
    $('#ponto-eletronico-search-dtini').datepicker( 'setDate', getFirstDayOfMonth(new Date()) );
    $('#ponto-eletronico-search-dtfim').datepicker( 'setDate', getLastDayOfMonth(new Date()) );

    $('#ponto-eletronico-search-btnconsultar').click(function(event) {
    	matricula = document.getElementById("ponto-eletronico-search-txtmat").value;
        if (typeof(Storage) !== "undefined") {
        	if (matricula == "") {
        		matricula = localStorage.getItem("matricula");
			} else {
				localStorage.setItem("matricula", matricula);
			}
    	}
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

    if(matricula != null && matricula > 0){
       $('#ponto-eletronico-search-btnconsultar').click();
    }
}

function calculaSaldos(ajax){
    var htmlObject = createElement("div",{},"");
    htmlObject.innerHTML = ajax;
    var listaDias = htmlObject.getElementsByClassName("odd/even");
    Array.from(listaDias).forEach(
        function(element, index, array) {
            var tdSaldoDiario = atualizaSaldo(element);

            while(element.children.length > 5){
                element.removeChild(element.lastChild);
            }

            element.appendChild(tdSaldoDiario);
        }
    );

    var tdLabelSaldo = createElement("td",{'colspan':'3'},"Saldo final per�odo:");
    var tdSaldo = createElement("td",{},numToHora(saldoPeriodo));
    if(saldoPeriodo < 0){
        tdSaldo.style.color="red";
    } else {
        tdSaldo.style.color="blue";
    }
    tdSaldo.style.fontWeight="bold";

    listaDias[0].parentNode.insertRow();
    var trSaldo = listaDias[0].parentNode.lastChild;
    trSaldo.insertCell().innerText = "";
    trSaldo.insertCell().innerText = "";
    trSaldo.appendChild(tdLabelSaldo);
    trSaldo.appendChild(tdSaldo);
    return htmlObject;
}

function atualizaSaldo(linhaDOM){

    var pontoExcedente = 0;
    var linhaHora = linhaDOM.getElementsByTagName('td');

    var dia = linhaHora[0].innerText.trim();
    var cargaDia = getCargaDia(dia);

    var pontosSugeridos = 0;

    if(linhaHora[5] != null && linhaHora[5].innerText.trim() != ''){
        pontoExcedente = linhaHora[4].innerText.trim();
        linhaHora[4].innerText = linhaHora[5].innerText.trim();
        linhaHora[5].innerText = "";
    }

    var entrada = linhaHora[1].innerText.trim();
    if (linhaHora[2] == null) { linhaDOM.appendChild(createElement("td",{},"")); }
    if (linhaHora[3] == null) { linhaDOM.appendChild(createElement("td",{},"")); }
    if (linhaHora[4] == null) { linhaDOM.appendChild(createElement("td",{},"")); }
    var almIni = linhaHora[2].innerText.trim();
    var almFim = linhaHora[3].innerText.trim();
    var saida = linhaHora[4].innerText.trim();

    if(cargaDia < 8){
        saida = linhaHora[2].innerText.trim();;
        almIni = "12:00";
        almFim = "13:00";

        linhaHora[2].innerText = almIni;
        linhaHora[2].style.color="red";
        linhaHora[2].style.fontWeight="bold";
        pontosSugeridos += 1;

        linhaHora[3].innerText = almFim;
        linhaHora[3].style.color="red";
        linhaHora[3].style.fontWeight="bold";
        pontosSugeridos += 1;

        linhaHora[4].innerText = saida;
    } else{
        if(horaToNum(entrada) > (11*60)){
            saida = almFim;
            almFim = almIni;
            almIni = entrada;
            entrada = entradaSugerida;
            linhaHora[1].innerText = entradaSugerida;
            linhaHora[1].style.color="red";
            linhaHora[1].style.fontWeight="bold";
            pontosSugeridos += 1;
        }
    }
    linhaHora[2].innerText = almIni;
    linhaHora[3].innerText = almFim;
    linhaHora[4].innerText = saida;

    var sugereSaida = false;

    if(linhaHora[1].innerText.trim() == ""){
        linhaHora[1].innerText = entradaSugerida;
        linhaHora[1].style.color="red";
        linhaHora[1].style.fontWeight="bold";
		pontosSugeridos += 1;
    }

    if(linhaHora[2].innerText.trim() == ""){
        linhaHora[2].innerText = almIniSugerido;
        linhaHora[2].style.color="red";
        linhaHora[2].style.fontWeight="bold";
		pontosSugeridos += 1;
    }

    if(linhaHora[3].innerText.trim() == ""){
        linhaHora[3].innerText = almFimSugerido;
        linhaHora[3].style.color="red";
        linhaHora[3].style.fontWeight="bold";
   		pontosSugeridos += 1;
    }

    if(linhaHora[4].innerText.trim() == ""){
        sugereSaida = true;
        linhaHora[4].innerText = saidaSugerida;
        linhaHora[4].style.color="red";
        linhaHora[4].style.fontWeight="bold";
		pontosSugeridos += 1;
    }

    var pt1 = linhaHora[1].innerText.trim();
    var pt2 = linhaHora[2].innerText.trim();
    var pt3 = linhaHora[3].innerText.trim();
    var pt4 = linhaHora[4].innerText.trim();

    var manha = diffHora(pt1,pt2);
    var tarde = diffHora(pt3,pt4);
    if(cargaDia < 8){
        manha = diffHora(pt1,pt4);
        tarde = 0;
    }
    var almoco = cargaDia < 8 ? 0 : diffHora(pt2,pt3);

    var saldoDia = manha + tarde - (cargaDia*60);

    var tempoAlmoco = cargaDia < 8 ? 0 : 60;
    if(almoco <= tempoAlmoco && almoco >= (tempoAlmoco-10)){
        saldoDia += almoco-tempoAlmoco;
    } else if(almoco <= (tempoAlmoco+10) && almoco >= tempoAlmoco){
        saldoDia -= tempoAlmoco-almoco;
    } else if(almoco < (tempoAlmoco-10) && ((manha + tarde) > (cargaDia*60))){
        saldoDia = saldoDia-(tempoAlmoco-almoco);
        if(saldoDia < 0) {
            saldoDia = 0;
        }
    }

    saldoPeriodo += saldoDia;

    console.log(dia+' / '+cargaDia+' / '+tempoAlmoco+' / '+almoco+' / '+saldoPeriodo+' / '+saldoDia)
    if(sugereSaida && saldoPeriodo < 0){
        linhaHora[4].innerText = numToHora(horaToNum(saidaSugerida)-saldoPeriodo);
        saldoDia = 0;
        saldoPeriodo = 0;
    }

    var hrSaldoDia = numToHora(saldoDia);

    var txtSaldoDia = createElement("text",{"id":dia+"-txt5"},hrSaldoDia);
    var tdSaldoDia = createElement("td",{"id":dia+"-td5"},txtSaldoDia);

    var iconFavorito;
    if(pontoExcedente){
        hrSaldoDia = hrSaldoDia;
        iconFavorito = createElement("i",{"class":"fa fa-star"},"");
        iconFavorito.setAttribute('title','Ponto excedente ignorado nos c�lculos: ' + pontoExcedente);
        tdSaldoDia.appendChild(iconFavorito);
    }

    if(pontosSugeridos > 1 || cargaDia < 8){
        var iconDiaEspecial
        if(cargaDia == 6){
            iconDiaEspecial = createElement("spam",{"class":"fa fa-check-square"},"");
            iconDiaEspecial.setAttribute('title','Alternar para dia com 8h');
        } else if(cargaDia == 7){
            iconDiaEspecial = createElement("spam",{"class":"fa fa-check-square-o"},"");
            iconDiaEspecial.setAttribute('title','Alternar para dia com 6h');
        } else {
            iconDiaEspecial = createElement("spam",{"class":"fa fa-square-o"},"");
            iconDiaEspecial.setAttribute('title','Alternar para dia com 7h');
        }

        iconDiaEspecial.addEventListener("click",
            function (){
                if(cargaDia != null && cargaDia != ''){
                    if(cargaDia == 7){
                        localStorage.setItem(dia, 6);
                    } else {
                        localStorage.removeItem(dia);
                    }
                } else {
                    localStorage.setItem(dia, 7);
                }
                document.getElementById('ponto-eletronico-search-btnconsultar').click();
            }
        );
        tdSaldoDia.appendChild(iconDiaEspecial);
    }

    if(saldoDia < 0){
        tdSaldoDia.style.color="red";
    } else if(saldoDia > 0){
        tdSaldoDia.style.color="blue";
    }

    tdSaldoDia.style.fontWeight="bold";

    return tdSaldoDia;
}

function getCargaDia(dia){
    var horas = localStorage.getItem(dia);
    if(horas != null && horas != ''){
        return horas;
    } else {
        return 8;
    }
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

$(document).ready(setFields());
