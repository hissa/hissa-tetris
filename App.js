class App{
    static main(){
        App.table = new FieldTable(10, 20);
        App.table.make($("#field"));
        App.field = new Field();
        App.makeShowTetriminoTables();
        App.field.start();
        App.show();
        App.addEventListeners();
        setInterval(()=>{
            App.field.tick();
            App.show();
        }, 700);
        App.field.addGameOverEvent(()=>{
            console.log("GameOver.");
        });
        console.log("done");
    }

    static makeShowTetriminoTables(){
        App.hold = new ShowTetriminoTable();
        App.hold.make($("#hold"));
        App.nexts = [];
        for(var i = 0; i <= 4; i++){
            App.nexts[i] = new ShowTetriminoTable();
            App.nexts[i].make($("#next{0}".format(i)));
        }
    }

    static show(){
        App.table.show(App.field);
        for(var i = 0; i<= 4; i++){
            App.nexts[i].addTetrimino(new Tetrimino(App.field.dicider.getNext(i)));
        }
    }

    static down(){
        App.field.downCurrentTetrimino();
        App.show();
    }

    // windowに対してキー入力のイベントリスナーを追加
    static addEventListeners(){
        $(window).on("keydown", (e)=>{
            App.keydown(e.which);
        });
    }

    // キー入力があった場合の処理
    static keydown(keyCode){
        if(Keys[keyCode] != undefined){
            switch(Keys[keyCode]){
                case "left":
                case "right":
                case "down":
                    App.field.moveCurrentTetrimino(Keys[keyCode]);
                    App.show();
                    break;
                case "antiClockwize":
                    App.field.rotateAntiClockwizeCurrentTetrimino();
                    App.show();
                    break;
                case "clockwize":
                    App.field.rotateClockwizeCurrentTetrimino();
                    App.show();
                    break;
                case "up":
                    break;
                default:
                    break;
            }
        }
    }
}

// フィールドを表示するテーブルのクラス
class FieldTable{
    // int sizeX: 横幅
    // int sizeY: 縦幅
    constructor(sizeX, sizeY){
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        this.cells = [];
    }

    // フィールドのテーブルを作成、描画する。
    // jQueryObject jqueryObj: 描画するTable要素のjQueryオブジェクト
    make(jqueryObj){
        jqueryObj
            .append("<tbody id=\"fieldTableBody\" />")
            .css({ "border-collapse": "collapse" });
        var tbody = $("#fieldTableBody");
        var row = null;
        for(var y = this.sizeY - 1; y >= 0; y--){
            this.cells[y] = [];
            tbody.append("<tr id=\"row{0}\" />".format(y));
            row = $("#row{0}".format(y));
            for(var x = 0; x < this.sizeX; x++){
                row.append("<td id=\"r{0}c{1}\" />".format(y, x));
                this.cells[y][x] = $("#r{0}c{1}".format(y, x));
            }
        }
        this.doToAllCell((obj, y, x)=>{
            obj.css({
                "border": "1px #000000 solid",
                "height": "32px",
                "width": "32px"
            });
        });
    }

    // 全てのセルに対して処理をする。
    // function(jQueryObject jqueryObj, int y, int x) func: 実行する処理
    doToAllCell(func){
        this.cells.forEach((valueRow, indexY)=>{
            valueRow.forEach((valueColumn, indexX)=>{
                func(valueColumn, indexY, indexX);
            })
        })
    }

    // 画面を描画する。
    // Field field: 描画したいフィールドのオブジェクト
    show(field){
        this.doToAllCell((obj, indexY, indexX)=>{
            if(field.field[indexY][indexX] != undefined){
                obj.css({ "background-color": Colors[field.field[indexY][indexX].color] });
            }
        })
    }
}

class ShowTetriminoTable{
    constructor(){
        this.uniqueId = ShowTetriminoTable.getUniqueId();
        this.cells = [];
        this.sizeX = 4;
        this.sizeY = 2;
    }

    make(jqueryObj){
        jqueryObj
            .append("<tbody id=\"{0}tbody\" />".format(this.uniqueId))
            .css({ "border-collapse": "collapse" });
        for(var y = this.sizeY - 1; y >= 0; y--){
            this.cells[y] = [];
            $("#{0}tbody".format(this.uniqueId))
                .append("<tr id=\"{0}r{1}\" />".format(this.uniqueId, y));
            var row = $("#{0}r{1}".format(this.uniqueId, y));
            for(var x = 0; x < this.sizeX; x++){
                row.append("<td id=\"{0}r{1}c{2}\" />".format(this.uniqueId, y, x));
                this.cells[y][x] = $("#{0}r{1}c{2}".format(this.uniqueId, y, x));
            }
        }
        this.doToAllCell((obj, y, x)=>{
            obj.css({
                // "border": "1px #000000 solid",
                "height": "32px",
                "width": "32px"
            });
        });
    }

    addTetrimino(tetrimino){
        this.doToAllCell((obj)=>{
            obj.css({ "background-color": Colors["default"] });
        })
        var points = tetrimino.getBlockLocations(new Vector2());
        points.forEach((value)=>{
            if(this.cells[value.y] != undefined && this.cells[value.y][value.x] != undefined){
                this.cells[value.y][value.x]
                    .css({ "background-color": Colors[tetrimino.block] });
            }
        });
    }

    doToAllCell(func){
        this.cells.forEach((valueRow, indexY)=>{
            valueRow.forEach((valueColumn, indexX)=>{
                func(valueColumn, indexY, indexX);
            })
        })
    }

    static getUniqueId(){
        if(ShowTetriminoTable.usedUniqueId == undefined){
            ShowTetriminoTable.usedUniqueId = 0;
        }
        var toUse = ShowTetriminoTable.usedUniqueId;
        ShowTetriminoTable.usedUniqueId++;
        return toUse;
    }
}

// フィールドのクラス
class Field{
    constructor(){
        this.sizeX = 10;
        // テトリミノの出現位置を確保するためにsizeYを24にする。
        this.sizeY = 24;
        this.field = [];
        for(var y = 0; y < this.sizeY; y++){
            this.field[y] = [];
            for(var x = 0; x < this.sizeX; x++){
                this.field[y][x] = new Block(false);
            }
        }
        this.currentTetrimino = null;
        this.dicider = new TetriminoDicider();
        this.gameOverEvent = null;
        this.gameOvered = false;
        this.needRockdown = false;
        setInterval(()=>{
            if(this.needRockdown){
                this.needRockdown = false;
                this.rockdown();
            }
        }, 10);
    }

    // ゲームを開始します。
    start(){
        this.addCurrentTetrimino(new Tetrimino(this.dicider.get()));
    }

    // 落ちてくるテトリミノを追加します。
    // Tetrimino tetrimino: 追加するテトリミノのオブジェクト
    addCurrentTetrimino(tetrimino){
        var setted = tetrimino.clone();
        setted.location = new Vector2(3, 20);
        if(!this.canMoveTetrimino(setted)){
            console.log(this.currentTetrimino);
            if(this.gameOverEvent != null){
                this.gameOvered = true;
                this.gameOverEvent();
            }
        }
        this.currentTetrimino = setted;
        console.log("generated tetrimino");
        this.reloadCurrentTetrimino();
    }

    // ゲームオーバー時のイベントを追加します。
    addGameOverEvent(func){
        this.gameOverEvent = func;
    }

    // テトリミノをフィールド上に展開する。
    expantionTetrimino(tetrimino){
        var points = tetrimino.getBlockLocations();
        points.forEach((value)=>{
            if(this.field[value.y] != undefined && this.field[value.y][value.x] != undefined){
                //debug
                console.log(value);
                this.field[value.y][value.x] = new Block(true, tetrimino.block, false);
            }
        });
    }

    // ロックダウンしていないブロックをすべて消す。
    removeAirBlock(){
        this.doToAllblock((block, indexY, indexX)=>{
            this.field[indexY][indexX] = block.isRockedDown ? block : new Block(false);
        });
    }

    // 全てのブロックに対して処理をする。
    // function(Block block, int y, int x) func: 実行する処理
    doToAllblock(func){
        this.field.forEach((valueRow, indexY)=>{
            valueRow.forEach((valueColumn, indexX)=>{
                func(valueColumn, indexY, indexX);
            })
        })
    }

    downCurrentTetrimino(){
        this.moveCurrentTetrimino("down");
    }

    moveCurrentTetrimino(direction, distance = 1){
        var moved = this.currentTetrimino.clone();
        moved.move(direction, distance);
        if(this.canMoveTetrimino(moved)){
            this.currentTetrimino = moved;
            this.reloadCurrentTetrimino();
            return true;
        }else{
            if(direction == "down"){
                this.needRockdown = true;
            }
            return false;
        }
    }

    // movedで渡されたテトリミノがそこに存在できるかどうかを返します。
    // Tetrimino moved: 動かされたテトリミノ
    canMoveTetrimino(moved){
        var blocks = moved.getBlockLocations();
        var canMove = true;
        blocks.forEach((value)=>{
            if(!this.isExistsLocation(value) || this.field[value.y][value.x].isRockedDown){
                //debug
                console.log(value);
                if(this.field[value.y] != undefined){
                    console.log(this.field[value.y][value.x]);
                }
                canMove = false;
            }
        });
        console.log(canMove);
        return canMove;
    }

    // 指定された座標が存在するかどうか（フィールド内であるかどうか）を返す。
    // Vector2 location: 座標
    isExistsLocation(location){
        return !(this.field[location.y] == undefined || this.field[location.y][location.x] == undefined)
    }

    // カレントテトリミノを時計回りに回転する。
    // int number: 回転する回数
    rotateClockwizeCurrentTetrimino(number = 1){
        this.rotateCurrentTetrimino(number * -1);
    }

    // カレントテトリミノを反時計回りに回転する。
    // int number: 回転する回数
    rotateAntiClockwizeCurrentTetrimino(number = 1){
        this.rotateCurrentTetrimino(number);
    }

    // カレントテトリミノを回転する。
    // int number: 回転する回数　正の数：反時計回り 負の数：時計回り
    rotateCurrentTetrimino(number){
        var moved = this.currentTetrimino.clone();
        moved.rotateTetrimino(number);
        if(this.canMoveTetrimino(moved)){
            this.currentTetrimino = moved;
        }else{
            // 回転させることができない場合は最大2マス上下左右に動かせるものとする
            // 優先度は1マス->2マスで、左->右->上->下
            var priorityOrder = ["left", "right", "up", "down"];
            var toBreak = false;
            for(var moveBlocks = 1; moveBlocks <= 2; moveBlocks++){
                for(var i = 0; i < 4; i++){
                    var moved2 = moved.clone();
                    moved2.move(priorityOrder[i], moveBlocks);
                    if(this.canMoveTetrimino(moved2)){
                        this.currentTetrimino = moved2;
                        toBreak = true;
                        break;
                    }
                }
                if(toBreak){
                    break;
                }
            }
        }
        this.reloadCurrentTetrimino();
    }

    // カレントテトリミノを更新する。
    reloadCurrentTetrimino(){
        this.removeAirBlock();
        this.expantionTetrimino(this.currentTetrimino);
    }

    // setInterval()などを用いてこのメソッドを任意の間隔で呼び出してください。
    tick(){
        if(this.gameOvered){
            return;
        }
        var moved = this.moveCurrentTetrimino("down");
        if(!moved){
            this.needRockdown = true;
        }
    }

    rockdown(){
        this.currentTetrimino.rockdown();
        this.doToAllblock((value)=>{
            if(!value.isRockedDown){
                value.rockDown();
            }
        });
        this.removeLines();
        this.addCurrentTetrimino(new Tetrimino(this.dicider.get(), new Vector2(0,0)));
    }

    removeLines(){
        var completedLines = this.getCompletedLine();
        var removedLineCount = 0;
        this.field.forEach((value, index)=>{
            if(completedLines.indexOf(index) >= 0){
                removedLineCount++;
            }else{
                this.field[index - removedLineCount] = value;
                console.log("Line moved");
            }
        });
        // このままだと上から消したライン分に参照が残るので以下のコードで初期化
        for(var i = this.field.length - removedLineCount; i < this.field.length; i++){
            this.field[i] = [];
            for(var x = 0; x < this.sizeX; x++){
                this.field[i][x] = new Block();
            }
        }
    }

    getCompletedLine(){
        var lines = [];
        this.field.forEach((valueY, index)=>{
            var completed = true;
            valueY.forEach((valueX)=>{
                if(!valueX.isBlock){
                    completed = false;
                }
            });
            if(completed){
                lines.push(index);
            }
        });
        return lines;
    }
}

// フィールドに表示されるブロックのクラス
class Block{
    // bool isBlock: ブロックであるかどうか
    // string color: Colorsで定義された色を示す文字列
    // bool isRockedDown 既にロックダウンしているかどうか
    constructor(isBlock, color = "default", isRockedDown = false){
        this.isBlock = isBlock;
        this.color = color;
        this.isRockedDown = isRockedDown;
    }

    // isRockedDownをtrueに設定する。
    rockDown(){
        if(this.isBlock){
            this.isRockedDown = true;
        }
    }
}

// テトリミノのクラス
class Tetrimino{
    // string block: ブロックの種類を示す文字
    // int rotate: 回転された状態のテトリミノを生成する場合は指定する
    // Vector2 location: ブロックの基準点の座標
    constructor(block, location = null, rotate = 0){
        this.block = block;
        this.location = location == null ? new Vector2() : location;
        this.rotatePatternNum = TetriminoForms[block].length;
        this.rotate = rotate % this.rotatePatternNum;
        this.blockLocations = [];
        this.setBlockLocations();
        this.rockedDown = false;
    }

    rockdown(){
        this.rockedDown = true;
    }

    setBlockLocations(){
        this.blockLocations = TetriminoForms[this.block][this.rotate];
    }

    getBlockLocations(originPoint = null){
        var origin = originPoint == null ? this.location : originPoint;
        var rets = [];
        this.blockLocations.forEach((value)=>{
            var location = value.clone();
            location.x += origin.x;
            location.y += origin.y;
            rets.push(location);
        });
        return rets;
    }

    // テトリミノの位置を動かす
    // string direction: up, down, right, leftのいずれか
    // int distance: 何マス動かすか
    move(direction, distance = 1){
        if(this.rockedDown){
            return;
        }
        if(direction == "up" || direction == "down"){
            this.location.y += direction == "up" ? distance : distance * -1;
        }
        if(direction == "right" || direction == "left"){
            this.location.x += direction == "right" ? distance : distance * -1;
        }
    }

    //回転する
    // int rotateNumber: 回転する回数　正の数：反時計回り 負の数：時計回り
    rotateTetrimino(rotateNumber){
        if(this.rockedDown){
            return;
        }
        this.rotate = (this.rotate + rotateNumber) % this.rotatePatternNum;
        if(this.rotate < 0){
            this.rotate = this.rotatePatternNum + this.rotate;
        }
        this.setBlockLocations();
        console.log(this.rotatePatternNum, this.rotate);
        console.log(this.blockLocations);
    }

    // 時計回りに回転する
    // int number: 回転する回数
    rotateClockwize(number = 1){
        this.rotateTetrimino(number * -1);
    }

    // 反時計回りに回転する
    // int number: 回転する回数
    rotateAntiClockwize(number = 1){
        this.rotateTetrimino(number);
    }

    // オブジェクトをコピーして返します。
    clone(){
        return new Tetrimino(this.block, this.location.clone(), this.rotate);
    }
}

// 二次元空間上での距離のクラス
class DistanceVector2{
    // int x: x軸の距離
    // int y: y軸の距離
    constructor(x = 0, y = 0){
        this.x = x;
        this.y = y;
    }

    clone(){
        return new DistanceVector2(this.x, this.y);
    }
}


// 二次元空間上での座標を表すクラス
class Vector2{
    // int x: xの座標
    // int y: yの座標
    constructor(x = 0, y = 0){
        this.x = x;
        this.y = y;
    }

    clone(){
        return new Vector2(this.x, this.y);
    }
}

class TetriminoDicider{
    constructor(keepSets = 1){
        this.tetriminoPatterns = TetriminoForms.length;
        this.keepSets = keepSets;
        this.currentSet = [];
        this.reserveSets = [];
        this.makeSetsWhileNeeds();
    }

    get(){
        var ret = this.currentSet[0];
        this.currentSet.shift();
        this.makeSetsWhileNeeds();
        return ret;
    }

    isNeedsMakeSet(){
        return this.reserveSets.length < this.keepSets
    }

    makeSetsWhileNeeds(){
        this.ReplenishCurrentSet();
        while(this.isNeedsMakeSet()){
            this.makeSet();
        }
    }

    makeSet(){
        var min = 0;
        var max = 0;
        var randNum = 0;
        var patterns = ["I", "O", "S", "Z", "J", "L", "T"];
        var set = [];
        while(patterns.length > 0){
            max = patterns.length - 1;
            randNum = Math.floor(Math.random() * (max + 1 - min)) + min;
            set.push(patterns[randNum]);
            patterns.splice(randNum, 1);
        }
        this.reserveSets.push(set);
        this.ReplenishCurrentSet();
    }

    ReplenishCurrentSet(){
        if(this.currentSet == undefined || this.currentSet.length <= 0){
            this.currentSet = this.reserveSets[0];
            this.reserveSets.shift();
        }
    }

    getNext(num){
        if(num < 0 && num >5){
            throw new Error("指定されたnumはサポートされていません。");
        }
        if(this.currentSet.length - 1 >= num){
            return this.currentSet[num];
        }else{
            var refSet = Math.floor((num - this.currentSet.length) / this.reserveSets[0].length);
            var refIndex = (num - this.currentSet.length) % this.reserveSets[0].length;
            console.log(num, refSet, refIndex);
            return this.reserveSets[refSet][refIndex];
        }
    }
}


// ブロックの形を定義
// 出現エリアの左下を原点とした場合のそこからの距離
// 回転された場合の形を反時計回りで配列としてそれぞれ定義する
var TetriminoForms = {
    "I": [ 
        [
            new DistanceVector2(0, 0),
            new DistanceVector2(1, 0),
            new DistanceVector2(2, 0),
            new DistanceVector2(3, 0)
        ],
        [
            new DistanceVector2(2, 1),
            new DistanceVector2(2, 0),
            new DistanceVector2(2, -1),
            new DistanceVector2(2, -2)
        ]
    ],
    "O": [
        [
            new DistanceVector2(1, 1),
            new DistanceVector2(2, 1),
            new DistanceVector2(1, 0),
            new DistanceVector2(2, 0)
        ]
    ],
    "S": [
        [
            new DistanceVector2(0, 0),
            new DistanceVector2(1, 0),
            new DistanceVector2(1, 1),
            new DistanceVector2(2, 1)
        ],
        [
            new DistanceVector2(0, 2),
            new DistanceVector2(0, 1),
            new DistanceVector2(1, 1),
            new DistanceVector2(1, 0)
        ]
    ],
    "Z": [
        [
            new DistanceVector2(0, 1),
            new DistanceVector2(1, 1),
            new DistanceVector2(1, 0),
            new DistanceVector2(2, 0)
        ],
        [
            new DistanceVector2(2, 2),
            new DistanceVector2(2, 1),
            new DistanceVector2(1, 1),
            new DistanceVector2(1, 0)
        ]
    ],
    "J": [
        [
            new DistanceVector2(0, 1),
            new DistanceVector2(0, 0),
            new DistanceVector2(1, 0),
            new DistanceVector2(2, 0)
        ],
        [
            new DistanceVector2(0, 0),
            new DistanceVector2(1, 0),
            new DistanceVector2(1, 1),
            new DistanceVector2(1, 2)
        ],
        [
            new DistanceVector2(0, 1),
            new DistanceVector2(1, 1),
            new DistanceVector2(2, 1),
            new DistanceVector2(2, 0)
        ],
        [
            new DistanceVector2(1, 0),
            new DistanceVector2(1, 1),
            new DistanceVector2(1, 2),
            new DistanceVector2(2, 2)
        ]
    ],
    "L": [
        [
            new DistanceVector2(0, 0),
            new DistanceVector2(1, 0),
            new DistanceVector2(2, 0),
            new DistanceVector2(2, 1)
        ],
        [
            new DistanceVector2(0, 2),
            new DistanceVector2(1, 2),
            new DistanceVector2(1, 1),
            new DistanceVector2(1, 0)
        ],
        [
            new DistanceVector2(0, 0),
            new DistanceVector2(0, 1),
            new DistanceVector2(1, 1),
            new DistanceVector2(2, 1)
        ],
        [
            new DistanceVector2(1, 2),
            new DistanceVector2(1, 1),
            new DistanceVector2(1, 0),
            new DistanceVector2(2, 0)
        ]
    ],
    "T": [
        [
            new DistanceVector2(0, 0),
            new DistanceVector2(1, 0),
            new DistanceVector2(2, 0),
            new DistanceVector2(1, 1)
        ],
        [
            new DistanceVector2(0, 1),
            new DistanceVector2(1, 2),
            new DistanceVector2(1, 1),
            new DistanceVector2(1, 0)
        ],
        [
            new DistanceVector2(0, 1),
            new DistanceVector2(1, 1),
            new DistanceVector2(2, 1),
            new DistanceVector2(1, 0)
        ],
        [
            new DistanceVector2(1, 0),
            new DistanceVector2(1, 1),
            new DistanceVector2(1, 2),
            new DistanceVector2(2, 1)
        ]
    ]
}

// 色
var Colors = {
    "default": "#ffffff",
    "I": "#03A9F4",
    "O": "#FFEB3B",
    "S": "#8BC34A",
    "Z": "#FF5722",
    "J": "#3F51B5",
    "L": "#FF9800",
    "T": "#673AB7"
};


// 操作キー
var Keys = {
    87: "up",
    65: "left",
    83: "down",
    68: "right",
    37: "antiClockwize",
    38: "clockwize"
};

App.main();