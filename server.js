import { WebSocketServer } from 'ws';
let gameStarted = false
let tabellone = []
let ambo = false
let terna = false
let quaterna = false
let cinquina = false
let tombola = false

const wss = new WebSocketServer({ port: 8080 });
let sockets = []
let numberList = []
let cronologia = []

class client {
  #nickname
  #ws
  ready
  card
  constructor(nickname, ws) {
    this.#nickname = nickname
    this.#ws = ws
    this.ready = false
  }
  get nickname() {
    return this.#nickname
  }
  get ws() {
    return this.#ws
  }
}

wss.on('connection', function connection(ws) {
  ws.on('message', function message(data) {
    data = JSON.parse(data.toString())
    console.log(data)
    const type = data.type

    switch (type) {
      case "connect": {
        let newClient = new client(data.nickname, ws)
        sockets.push(newClient)

        if (gameStarted == true) {
          let message = { "type": "disconnect", "reason": "GAME STARTED" }
          ws.send(JSON.stringify(message))
          ws.close()
        }
        break;
      }

      case "ready": {
        for (let i = 0; i < sockets.length; i++) {
          if (sockets[i].ws == ws) {
            sockets[i].ready = true
            break;
          }
        }
        startGame()
        break;
      }

      case "tabellone": {
        let message = { "type": "tabellone", "tabellone": tabellone }
        ws.send(JSON.stringify(message))
        break;
      }

      case "createCard": {
        let index
        for (let i = 0; i < sockets.length; i++) {
          if (sockets[i].ws == ws) {
            index = i
            break;
          }
        }
        let card = createCard()
        sockets[index].card = card
        let message = { "type": "card", "card": card }
        ws.send(JSON.stringify(message))
        break;
      }

      case "leave": {
        for (let i = 0; i < sockets.length; i++) {
          if (sockets[i].ws == ws) {
            sockets.splice(i, 1)
            break;
          }
        }
        let message = { "type": "disconnect", "reason": "YOU LEFT THE GAME" }
        ws.send(JSON.stringify(message))
        ws.close()

        break;
      }
      case "cronologia": {
        let message = { "type": "cronologia", "cronologia": cronologia }
        ws.send(JSON.stringify(message))
        break;
      }
      case "error":
      default: {
        let message = { "type": "error", "content": "Invalid JSON format" }
        ws.send(JSON.stringify(message))
        break;
      }
    }
  });
});

function startGame() {

  if (gameStarted == false && sockets.length >= 2 && allReady() == true) {
    reset()
    gameStarted = true

    for (let i = 0; i < 90; i++) {
      tabellone[i] = { "numero": i + 1, "estratto": false }
    }

    startGame()
  } else if (gameStarted == true && sockets.length >= 2 && allReady() == true) {
    sortNumber()
  } else if (sockets.length < 2 && gameStarted == true) {
    reset()
    let message = { "type": "disconnect", "reason": "ONLY ONE PLAYER" }
    sockets[0].ws.send(JSON.stringify(message))
    sockets[0].ws.close()
    sockets = []

  }
}

function reset() {
  ambo = false
  terna = false
  quaterna = false
  cinquina = false
  tombola = false

  gameStarted = false

  cronologia = []
  numberList = []
  for (let i = 1; i <= 90; i++) {
    numberList.push(i)
  }

  for (let i = 0; i < 90; i++) {
    tabellone[i] = { "numero": i + 1, "estratto": false }
  }
}

function sortNumber() {
  let indexRand = Math.floor(Math.random() * numberList.length)
  let number = numberList[indexRand]
  cronologia.push(number)
  numberList.splice(indexRand, 1)

  tabellone[number - 1].estratto = true

  for (let i = 0; i < sockets.length; i++) {
    let message = { "type": "number", "number": number }
    sockets[i].ws.send(JSON.stringify(message))
    sockets[i].ready = false

    let obj = controllaCartella(number, sockets[i])
    if (obj.vincita != "niente") {

      for (let j = 0; j < sockets.length; j++) {
        if(j == i){
          message = { "type": "vincita", "nickname": obj.socket.nickname, "vincita": obj.vincita, "you": true}
        }else{
          message = { "type": "vincita", "nickname": obj.socket.nickname, "vincita": obj.vincita, "you": false }
        }
        sockets[j].ws.send(JSON.stringify(message))
      }

      if (obj.vincita == "tombola") {
        for (let j = 0; j < sockets.length; j++) {

          sockets[j].ws.send(JSON.stringify(message))
        }
        message = { "type": "disconnect", "reason": "GAME FINISHED" }

        for (let j = 0; j < sockets.length; j++) {
          sockets[j].ws.send(JSON.stringify(message))
          sockets[j].ws.close()
        }

        reset()
        sockets = []
        break;
      }
    }


    sockets[i].card = obj.cartella
    message = { "type": "card", "card": sockets[i].card }
    sockets[i].ws.send(JSON.stringify(message))
  }
}

function allReady() {
  let condition = true

  for (let i = 0; i < sockets.length; i++) {
    if (sockets[i].ready == false) {
      condition = false
      break
    }
  }

  return condition
}

function createCard() {
  //Creo cartella vuota  
  let cartella = []
  for (let i = 0; i < 9; i++) {
    cartella[i] = []
    for (let j = 0; j < 3; j++) {
      cartella[i][j] = {"numero": 0, "estratto": false}
    }
  }

  //90 numeri divisi per decine
  let number = 0
  let numeri = []
  for (let i = 0; i < 9; i++) {
    numeri[i] = []
    for (let j = 0; j < 10; j++) {
      numeri[i][j] = number
      number++
    }
  }
  numeri[0].splice(0, 1)
  numeri[8][9] = 90

  //Max 3 numeri per colonna
  let numeri_per_colonna = []
  for (let i = 0; i < 9; i++) {
    numeri_per_colonna.push(i)
    numeri_per_colonna.push(i)
    numeri_per_colonna.push(i)
  }

  let numeroEstratto = []
  for (let i = 0; i < 15; i++) {
    //decina
    let rand = Math.floor(Math.random() * numeri_per_colonna.length)
    let pos_decina = numeri_per_colonna[rand]
    numeri_per_colonna.splice(rand, 1)

    //numero 
    let num_rand = Math.floor(Math.random() * numeri[pos_decina].length)
    let numero = numeri[pos_decina][num_rand]
    numeri[pos_decina].splice(num_rand, 1)
    numeroEstratto.push(numero)

    if (cartella[pos_decina][0].numero == 0) {
      cartella[pos_decina][0].numero = numero
    } else if (cartella[pos_decina][1].numero == 0) {
      cartella[pos_decina][1].numero = numero
    } else {
      cartella[pos_decina][2].numero = numero
    }
  }

  //5 numeri per riga
  do {
    let colonna = Math.floor(Math.random() * 9)
    cartella[colonna].sort(function (a, b) { return Math.random() - 0.5 })
  } while (riga_da_5(cartella))


  //riordinamento colonne
  for (let i = 0; i < 9; i++) {
    if (cartella[i][0].numero != 0 && cartella[i][1].numero != 0 && cartella[i][2].numero != 0) {//tutti numeri
      cartella[i].sort()
    } else if (cartella[i][0].numero == 0 && cartella[i][1].numero != 0 && cartella[i][2].numero != 0) {//[0] == 0
      if (cartella[i][1].numero > cartella[i][2].numero) {
        let temp = cartella[i][1]
        cartella[i][1] = cartella[i][2]
        cartella[i][2] = temp
      }
    } else if (cartella[i][0].numero != 0 && cartella[i][1].numero == 0 && cartella[i][2].numero != 0) {//[1] == 0
      if (cartella[i][0].numero > cartella[i][2].numero) {
        let temp = cartella[i][0]
        cartella[i][0] = cartella[i][2]
        cartella[i][2] = temp
      }
    } else if (cartella[i][0].numero != 0 && cartella[i][1].numero != 0 && cartella[i][2].numero == 0) {//[2] == 0
      if (cartella[i][0].numero > cartella[i][1].numero) {
        let temp = cartella[i][0]
        cartella[i][0] = cartella[i][1]
        cartella[i][1] = temp
      }
    }
  }

  return cartella
}

function riga_da_5(cartella) {
  let riga0 = 0, riga1 = 0, riga2 = 0

  for (let i = 0; i < 9; i++) {
    if (cartella[i][0].numero != 0) {
      riga0++
    }
    if (cartella[i][1].numero != 0) {
      riga1++
    }
    if (cartella[i][2].numero != 0) {
      riga2++
    }
  }

  if (riga0 == riga1 && riga0 == riga2) {
    return false
  }
  return true
}

function controllaCartella(numero, socket) {
  let cartella = socket.card
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 3; j++) {
      if (cartella[i][j].numero == numero) {
        cartella[i][j].estratto = true
      }
    }
  }

  let sommaRiga0 = 0
  let sommaRiga1 = 0
  let sommaRiga2 = 0

  for (let i = 0; i < 9; i++) {
    if (cartella[i][0].estratto == true) {
      sommaRiga0++
    }
    if (cartella[i][1].estratto == true) {
      sommaRiga1++
    }
    if (cartella[i][2].estratto == true) {
      sommaRiga2++
    }
  }

  if ((sommaRiga0 == 5 && sommaRiga1 == 5 && sommaRiga2 == 5) && tombola == false) {
    tombola = true
    return { "vincita": "tombola", "socket": socket, "cartella": cartella }
  }

  if ((sommaRiga0 == 5 || sommaRiga1 == 5 || sommaRiga2 == 5) && cinquina == false) {
    cinquina = true
    return { "vincita": "cinquina", "socket": socket, "cartella": cartella }
  }

  if ((sommaRiga0 == 4 || sommaRiga1 == 4 || sommaRiga2 == 4) && quaterna == false) {
    quaterna = true
    return { "vincita": "quaterna", "socket": socket, "cartella": cartella }
  }

  if ((sommaRiga0 == 3 || sommaRiga1 == 3 || sommaRiga2 == 3) && terna == false) {
    terna = true
    return { "vincita": "terna", "socket": socket, "cartella": cartella }
  }

  if ((sommaRiga0 == 2 || sommaRiga1 == 2 || sommaRiga2 == 2) && ambo == false) {
    ambo = true
    return { "vincita": "ambo", "socket": socket, "cartella": cartella }
  }

  return { "vincita": "niente", "socket": socket, "cartella": cartella }
}