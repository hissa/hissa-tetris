class Server{
    static main(){
        var http = require("http");
        var socketio = require("socket.io");
        Server.fs = require("fs");
        Server.server = http.createServer(Server.routing);
        Server.server.listen(3000, ()=>{
            console.log("Server is running...");
        });
        Server.io = socketio.listen(Server.server);
        Server.gameroom = new GameRoom();
        Server.io.sockets.on("connection", (socket)=>{
            console.log("A client connected.");
            socket.on("submitScore", (data)=>{
                Server.gameroom.setPlayerScore(data.name, Score.parse(data.score));
                console.log(data);
            });
            socket.on("playerJoin", (data)=>{
                Server.gameroom.join(data.name);
                console.log(data.name + " joined to the game.");
            });
        });
        setInterval(Server.playerScoresDistribution, 1000);
    }

    static playerScoresDistribution(){
        var data = {};
        Object.keys(Server.gameroom.scores).forEach((value)=>{
            data[value] = Server.gameroom.scores[value].ToArray();
        });
        Server.io.sockets.emit("ditributionPlayerScores", data);
    }

    static routing(req, res){
        switch(req.url){
        case "/":
            res.writeHead(200, {"Content-Type": "text/html"});
            res.write(Server.fs.readFileSync(__dirname + "/index.html", "utf-8"));
            break;
        case "/style.css":
            res.writeHead(200, {"Content-Type": "text/css"});
            res.write(Server.fs.readFileSync(__dirname + "/style.css", "utf-8"));
            break;
        case "/string-format.js":
            res.writeHead(200, {"Content-Type": "text/javascript"});
            res.write(Server.fs.readFileSync(__dirname + "/string-format.js", "utf-8"));
            break;
        case "/App.js":
            res.writeHead(200, {"Content-Type": "text/javascript"});
            res.write(Server.fs.readFileSync(__dirname + "/App.js", "utf-8"));
            break;
        default:
            res.writeHead(404);
            break;
        }
        res.end();
    }
}

class GameRoom{
    constructor(){
        this.scores = [];
    }

    hasPlayer(name){
        return name in this.scores;
    }

    join(name){
        if(this.hasPlayer(name)){
            return;
        }
        this.scores[name] = new Score();
    }

    setPlayerScore(name, score){
        if(!this.hasPlayer(name)){
            return;
        }
        this.scores[name] = score;
    }

    getAllScore(){
        var ret = [];
        this.playerList.forEach((value)=>{
            ret.push(this.scores[value]);
        });
        return ret;
    }

    playerList(){
        return Object.keys(this.scores);
    }
}

class Score{
    constructor(){
        this.point = 0;
        this.line = 0;
        this.gameOver = false;
    }

    static parse(obj){
        var ret = new Score();
        ret.line = obj.line;
        ret.point = obj.point;
        return ret;
    }

    gameOver(){
        this.gameOver = true;
    }

    ToArray(){
        return {
            line: this.line,
            point: this.point
        };
    }
}

// class Player{
//     constructor(name){
//         this.score = new Score();
//         this.name = name;
//     }
// }

Server.main();