let nickname
let card

let div_connetti
let div_ready
let div_leave
let div_cronologia
let div_tabellone
let contatore = 0


var ws = new WebSocket("ws://localhost:8080")

window.onunload = function () {
    contatore++
    if (contatore > 1) {
        LEAVE()
    }
};


window.addEventListener("load", function () {
    div_ready = document.getElementById("Ready")
    div_ready.remove()

    div_leave = document.getElementById("Leave")
    div_leave.remove()

    div_cronologia = document.getElementById("Cronologia")
    div_cronologia.remove()

    div_tabellone = document.getElementById("Tabellone")
    div_tabellone.remove()
})

function CRONOLOGIA() {
    let message = { "type": "cronologia", "nickname": nickname }
    ws.send(JSON.stringify(message))
}

function TABELLONE() {
    let message = { "type": "tabellone", "nickname": nickname }
    ws.send(JSON.stringify(message))
}

function CONNECT() {
    nickname = document.getElementById("nickname").value
    let message = { "type": "connect", "nickname": nickname }
    ws.send(JSON.stringify(message))

    message = { "type": "createCard" }
    ws.send(JSON.stringify(message))


    div_connetti = document.getElementById("Connetti")
    div_connetti.remove()

    let genitore1 = document.getElementById("Div_ready")
    genitore1.appendChild(div_ready)

    let genitore2 = document.getElementById("Div_leave")
    genitore2.appendChild(div_leave)
}

function READY() {
    let message = { "type": "ready", "nickname": nickname }
    ws.send(JSON.stringify(message))
}

function LEAVE() {
    let message = { "type": "leave", "nickname": nickname }
    ws.send(JSON.stringify(message))

    let genitore = document.getElementById("Div_connetti")
    genitore.appendChild(div_connetti)

    div_ready = document.getElementById("Ready")
    div_ready.remove()

    div_cronologia = document.getElementById("Cronologia")
    div_cronologia.remove()

    div_tabellone = document.getElementById("Tabellone")
    div_tabellone.remove()
}

ws.onmessage = function (message_from_server) {
    let data = message_from_server.data;
    data = JSON.parse(data)
    console.log(data)
    const type = data.type

    switch (type) {
        case "vincita": {

            if(data.you == true){
                document.getElementById("NicknameVincita").innerHTML = data.nickname + "\t(you)"
            }else{
                document.getElementById("NicknameVincita").innerHTML = data.nickname
            }
            document.getElementById("TipoVincita").innerHTML = data.vincita

            if (data.vincita != "niente") {
                const modal = new bootstrap.Modal(document.getElementById('vincitaModal'));
                modal.show();
            }

            break;
        }
        case "number": {
            let numero = data.number
            document.getElementById("NumeroEstratto").innerHTML = "Number extrated: " + numero

            let genitore1 = document.getElementById("Div_cronologia")
            genitore1.appendChild(div_cronologia)

            let genitore2 = document.getElementById("Div_tabellone")
            genitore2.appendChild(div_tabellone)
            break;
        }
        case "disconnect": {
            let body = document.querySelector("body");

            while (body.firstChild) {
                body.removeChild(body.firstChild);
            }
            let message = document.createElement("div");

            message.textContent = "DISCONNECTED:\n" + data.reason
            message.style.position = "fixed";
            message.style.top = "50%";
            message.style.left = "50%";
            message.style.transform = "translate(-50%, -50%)";

            document.querySelector("body").appendChild(message);

            body.appendChild(message);

            console.log("disconnected: " + data.reason)

            let refreshed = false

            if (refreshed == false) {
                setTimeout(function () {
                    location.reload();
                }, 5000);
                refreshed = true;
            }
            break;
        }
        case "cronologia": {
            let tabella = '<div class="table-responsive"><h4 class="text-center">Cronologia:</h4><table class="table align-middle text-center"><tbody>'



            for (let i = 0; i < data.cronologia.length; i++) {
                if (i % 10 == 0) {
                    tabella += "<tr>"
                }
                tabella += "<td>"
                tabella += data.cronologia[i]
                tabella += "</td>"

                if (i % 10 == 9 || (i == data.cronologia.length - 1 && i != 89)) {
                    tabella += "</tr>"
                }
            }

            tabella += "</tbody></table></div>"

            document.getElementById("StampaCronologia").innerHTML = tabella
            break;
        }
        case "card": {
            card = data.card
            stampaCartella(card)
            break;
        }
        case "tabellone": {
            stampaTabellone(data.tabellone)
            break;
        }
        case "error":
        default: {
            console.log("Errore")
            break;
        }
    }
}



function stampaCartella(cartella) {
    let tabella = '<h4 class="text-center">Cartella ' + nickname + ':</h4><table class="table table-bordered align-middle text-center"><tbody>'

    for (let i = 0; i < 3; i++) {
        tabella += "<tr>"

        for (let j = 0; j < 9; j++) {
            if (cartella[j][i].numero == 0) {
                tabella += "<td style='width: calc(100% / 9);'>  </td>"
            } else {
                if (cartella[j][i].estratto == true) {
                    tabella += "<td style='width: calc(100% / 9); background-color: orange;'>"
                } else {
                    tabella += "<td style='width: calc(100% / 9);'>"
                }

                tabella += cartella[j][i].numero
                tabella += "</td>"
            }


        }

        tabella += "</tr>"
    }

    tabella += "</tbody></table>"

    document.getElementById("StampaCartella").innerHTML = tabella
}

function stampaTabellone(tabellone) {
    let tabella = '<div class="table-responsive"><table class="table table-bordered align-middle text-center"><tbody>'



    for (let i = 0; i < 90; i++) {
        if (i % 10 == 0) {
            tabella += "<tr>"
        }

        if (tabellone[i].estratto == true) {
            tabella += "<td style=' background-color: green;'>"
            tabella += tabellone[i].numero
            tabella += "</td>"
        } else {
            tabella += "<td>"
            tabella += tabellone[i].numero
            tabella += "</td>"
        }


        if (i % 10 == 9) {
            tabella += "</tr>"
        }
    }

    tabella += "</tbody></table></div>"

    document.getElementById("StampaTabellone").innerHTML = tabella
    console.log(tabellone)
}