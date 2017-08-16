class Server{
    static main(){
        var http = require("http");
        var socketio = require("socket.io");
        Server.url = require("url");
        Server.fs = require("fs");
        Server.server = http.createServer(Server.routing);
        Server.server.listen(3000, ()=>{
            console.log("Server is running...");
        });
        Server.io = socketio.listen(Server.server);
        Server.rooms = {"default": new GameRoom()};
        Object.keys(Server.rooms).forEach((value)=>{
            Server.rooms[value].distributionFunc = (data)=>{
                Server.io.to(value).emit("ditributionPlayerScores", JSON.stringify(data));
            };
        });
        Server.io.sockets.on("connection", (socket)=>{
            var name;
            var room;
            console.log("A client connected.");
            socket.on("submitScore", (data)=>{
                Server.rooms[room].setPlayerScore(name, Score.parse(data.score));
            });
            socket.on("playerJoinToRoom", (data)=>{
                if(!(Object.keys(Server.rooms).indexOf(data.roomName) >= 0)){
                    console.log("存在しないルーム名が指定されました。");
                    return;
                }
                if(Server.rooms[data.roomName].hasPlayer(data.name)){
                    console.log("既にルームに入っているプレイヤーが入ろうとしました。");
                    return;
                }
                Server.rooms[data.roomName].join(data.name);
                name = data.name;
                room = data.roomName;
                socket.join(room);
                socket.broadcast.to(room)
                    .emit("playerListChanged", JSON.stringify(Server.rooms[room].playerList()));
                console.log(data.name + "が" + data.roomName + "に接続しました。");
            });
            socket.on("getPlayerList", (data, ack)=>{
                var players = Server.rooms[room].playerList();
                ack(players);
            });
            socket.on("disconnect", ()=>{
                if(name == undefined){
                    console.log("A client disconnected.");
                    return;
                }
                Server.rooms[room].removePlayer(name);
                console.log(name + "が" + room + "から退室しました。");
            });
        });
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
        case "/game/rooms":
            res.writeHead(200, {"Content-Type": "application/json"});
            res.write(JSON.stringify(Object.keys(Server.rooms)));
            break;
        // case "/game/players":
        //     var parsedUrl = Server.url.parse(req.url, true);
        //     var get = parsedUrl.query;
        //     console.log(parsedUrl.query);
        //     if(get["room"] == undefined){
        //         res.writeHead(404);
        //     }else{
        //         var players = Server.rooms[get["room"]].playerList();
        //         res.writeHead(200, {"Content-Type": "application/json"});
        //         res.write(JSON.stringify(players));
        //     }
            // break;
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
        this.distributionFunc = ()=>{};
        this.interval = setInterval(()=>{
            this.distribution();
        }, 1000);
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

    removePlayer(name){
        if(!this.hasPlayer(name)){
            return;
        }
        delete this.scores[name];
    }

    playerList(){
        return Object.keys(this.scores);
    }

    distribution(){
        var data = [];
        this.playerList().forEach((value)=>{
            data.push({
                name: value,
                scores: this.scores[value].ToArray()
            });
        });
        data = data.sort((a, b)=>{
            if(a.scores.point == b.scores.point){
                return 0;
            }else if(a.scores.point < b.scores.point){
                return 1;
            }else{
                return -1;
            }
        });
        this.distributionFunc(data);
    }

    stopDitribution(){
        clearInterval(this.interval);
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