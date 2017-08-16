class App{
    static main(){
        App.initialize();
        // App.gameStart();
    }

    static initialize(){
        App.table = new FieldTable(10, 20);
        App.table.make($("#field"));
        App.field = new Field();
        App.gameRunning = false;
        App.makeShowTetriminoTables();
        App.makePointTable();
        App.makeEffectTable();
        App.makeInfoArea();
        App.addEventListeners();
        App.info.addMessage("Enterキーでゲーム開始");
        App.server = new Server($("#connectButton"), $("#playerName"), $("#rooms"));
    }

    static pressEnter(){
        if(!App.gameRunning){
            App.gameStart();
        }
    }
    
    static makeInfoArea(){
        App.info = new InfoArea($("#infoArea"));
    }

    static gameStart(){
        App.gameRunning = true;
        App.info.clearMessage();
        if(App.interval != undefined){
            clearInterval(App.interval);
        }
        App.interval = setInterval(()=>{
            App.field.tick();
            App.show();
        }, 700);
        App.field.addGameOverEvent(()=>{
            console.log("GameOver.");
            App.gameRunning = false;
            App.info.clearMessage();
            App.info.addMessage("Enterキーで再挑戦");
        });
        App.field.start();
    }

    static makeShowTetriminoTables(){
        App.hold = new ShowTetriminoTable("HOLD");
        App.hold.make($("#hold"));
        App.nexts = [];
        for(var i = 0; i <= 4; i++){
            App.nexts[i] = new ShowTetriminoTable(i == 0 ? "NEXT" : null);
            if(i != 0){
                App.nexts[i].blockSize = 25;
            }
            App.nexts[i].make($("#next{0}".format(i)));
        }
    }

    static makePointTable(){
        App.pointTable = new ShowPointTable();
        App.pointTable.make($("#pointTable"));
        App.field.pointChangedEvent = (points)=>{
            App.server.submitScore(points);
            App.pointTable.show(points);
        };
    }

    static makeEffectTable(){
        App.effectTable = new ShowEffectTable();
        App.effectTable.make($("#effectTable"));
        App.field.showEffectEvent = (datas)=>{
            App.effectTable.ren = datas.ren;
            App.effectTable.tetris = datas.tetris;
            App.effectTable.perfectClear = datas.perfectClear;
            App.effectTable.backToBack = datas.backToBack;
            App.effectTable.show();
        };
    }

    static show(){
        App.table.show(App.field);
        for(var i = 0; i<= 4; i++){
            App.nexts[i].addTetrimino(new Tetrimino(App.field.dicider.getNext(i)));
        }
        if(App.field.hold != null){
            App.hold.addTetrimino(App.field.hold);
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
                    if(!App.gameRunning) return;
                    App.field.moveCurrentTetrimino(Keys[keyCode]);
                    App.show();
                    break;
                case "antiClockwize":
                    if(!App.gameRunning) return;
                    App.field.rotateAntiClockwizeCurrentTetrimino();
                    App.show();
                    break;
                case "clockwize":
                    if(!App.gameRunning) return;
                    App.field.rotateClockwizeCurrentTetrimino();
                    App.show();
                    break;
                case "up":
                    if(!App.gameRunning) return;
                    App.field.hardDrop();
                    App.show();
                    break;
                case "hold":
                    if(!App.gameRunning) return;
                    App.field.holdTetrimino();
                    App.show();
                    break;
                case "enter":
                    App.pressEnter();
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
            });
        });
    }

    // 画面を描画する。
    // Field field: 描画したいフィールドのオブジェクト
    show(field){
        this.doToAllCell((obj, indexY, indexX)=>{
            if(field.field[indexY][indexX] != undefined){
                if(!field.field[indexY][indexX].ghost){
                    obj.css({ "background-color": Colors[field.field[indexY][indexX].color] });
                }else{
                    // obj.css({ "border-color": Colors[field.field[indexY][indexX].color] });
                    obj.css({ "background-color": GhostColors[field.field[indexY][indexX].color] });
                }
            }
        });
    }
}

class ShowTetriminoTable{
    constructor(title = null, blockSize = 32){
        this.uniqueId = ShowTetriminoTable.getUniqueId();
        this.cells = [];
        this.sizeX = 4;
        this.sizeY = 2;
        this.title = title;
        this.titleArea = null;
        this.blockSize = blockSize;
    }

    make(jqueryObj){
        jqueryObj
            .append("<thead id=\"{0}thead\" />".format(this.uniqueId))
            .append("<tbody id=\"{0}tbody\" />".format(this.uniqueId))
            .css({ "border-collapse": "collapse" });
        if(this.title != null){
            this.makeTitleArea();
        }
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
                "height": "{0}px".format(this.blockSize),
                "width": "{0}px".format(this.blockSize)
            });
        });
    }

    makeTitleArea(){
        $("#{0}thead".format(this.uniqueId))
            .append("<tr id=\"{0}titleRow\" />".format(this.uniqueId));
        $("#{0}titleRow".format(this.uniqueId))
            .append("<th id=\"{0}title\" />".format(this.uniqueId))
            .css({ "border-bottom": "1px #000000 solid" });
        this.titleArea = $("#{0}title".format(this.uniqueId));
        this.titleArea.attr({ "colspan": "4" });
        this.setTitle(this.title);
    }

    setTitle(title){
        this.title = title;
        this.titleArea.text(this.title);
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
        // テトリミノの出現位置を確保するためにsizeYを24にする。
        this.sizeX = 10;
        this.sizeY = 24;
        this.gameOverEvent = null;
        this.gameOvered = true;
        this.points = new Points();
        this.continueRemoveLine = 0;
        this.lastRemovedLines = 0;
        this.pointChangedEvent = ()=>{};
        this.showEffectEvent = ()=>{};
        setInterval(()=>{
            if(this.needRockdown){
                this.needRockdown = false;
                this.rockdown();
            }
        });
        this.initialize();
    }

    initialize(){
        this.field = [];
        for(var y = 0; y < this.sizeY; y++){
            this.field[y] = [];
            for(var x = 0; x < this.sizeX; x++){
                this.field[y][x] = new Block(false);
            }
        }
        this.currentTetrimino = null;
        this.dicider = new TetriminoDicider();
        this.needRockdown = false;
        this.hold = null;
        this.usedHold = false;
    }

    // ゲームを開始します。
    start(){
        this.initialize();
        this.addCurrentTetrimino(new Tetrimino(this.dicider.get()));
        this.gameOvered = false;
    }

    gameOver(){
        this.gameOvered = true;
        this.gameOverEvent();
        this.doToAllblock((obj)=>{
            if(obj.isBlock){
                obj.color = "gameOvered";
            }
        });
    }

    // 落ちてくるテトリミノを追加します。
    // Tetrimino tetrimino: 追加するテトリミノのオブジェクト
    addCurrentTetrimino(tetrimino){
        var setted = tetrimino.clone();
        setted.location = new Vector2(3, 20);
        if(!this.canMoveTetrimino(setted)){
            // 追加しようとした場所に既にブロックがあればゲームオーバー
            if(this.gameOverEvent != null){
                this.gameOver();
            }
        }
        this.currentTetrimino = setted;
        this.reloadCurrentTetrimino();
    }

    // ゲームオーバー時のイベントを追加します。
    addGameOverEvent(func){
        this.gameOverEvent = func;
    }

    // テトリミノをフィールド上に展開する。
    expantionTetrimino(tetrimino, ghost = false){
        var points = tetrimino.getBlockLocations();
        points.forEach((value)=>{
            if(this.field[value.y] != undefined && this.field[value.y][value.x] != undefined){
                this.field[value.y][value.x] = new Block(true, tetrimino.block, false, ghost);
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
        if(this.gameOvered){
            return false;
        }
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
                canMove = false;
            }
        });
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
        if(this.gameOvered){
            return;
        }
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
        this.makeGhost();
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
        var removedLines = this.removeLines();
        if(removedLines <= 0){
            this.continueRemoveLine = 0;
        }else{
            this.continueRemoveLine++;
        }
        var ren = this.continueRemoveLine <= 0 ? 0 : this.continueRemoveLine - 1;
        if(!(removedLines <= 0)){
            var perfectClear = true;
            this.doToAllblock((block)=>{
                if(block.isBlock){
                    perfectClear = false;
                }
            });
            var backToBack = removedLines == 4 && this.lastRemovedLines == 4;
            this.lastRemovedLines = removedLines;
            this.points.add(removedLines, ren, backToBack);
            if(perfectClear){
                this.points.perfectClear();
            }
            this.pointChangedEvent(this.points);
        }
        var tetris = removedLines >= 4;
        this.showEffectEvent({
            ren: ren,
            tetris: tetris,
            perfectClear: perfectClear,
            backToBack: backToBack
        });
        this.addCurrentTetrimino(new Tetrimino(this.dicider.get(), new Vector2(0,0)));
        this.usedHold = false;
    }

    removeLines(){
        var completedLines = this.getCompletedLine();
        var removedLineCount = 0;
        this.field.forEach((value, index)=>{
            if(completedLines.indexOf(index) >= 0){
                removedLineCount++;
            }else{
                this.field[index - removedLineCount] = value;
            }
        });
        // このままだと上から消したライン分に参照が残るので以下のコードで初期化
        for(var i = this.field.length - removedLineCount; i < this.field.length; i++){
            this.field[i] = [];
            for(var x = 0; x < this.sizeX; x++){
                this.field[i][x] = new Block();
            }
        }
        return removedLineCount;
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

    holdTetrimino(){
        if(!this.usedHold){
            var current = this.currentTetrimino.clone();
            if(this.hold == null){
                this.hold = new Tetrimino(current.block);
                this.addCurrentTetrimino(new Tetrimino(this.dicider.get()))
            }else{
                this.removeAirBlock();
                this.addCurrentTetrimino(this.hold);
                this.hold = new Tetrimino(current.block);
            }
            this.reloadCurrentTetrimino();
            this.usedHold = true;
        }
    }

    hardDrop(){
        if(this.gameOvered){
            return;
        }
        this.currentTetrimino = this.getGhost().clone();
        this.reloadCurrentTetrimino();
        this.needRockdown = true;
    }

    makeGhost(){
        var ghostTetrimino = this.getGhost();
        this.expantionTetrimino(ghostTetrimino, true);
    }

    getGhost(){
        var moved = this.currentTetrimino.clone();
        var moved2;
        var ret;
        var end = false;
        do{
            moved2 = moved.clone();
            moved2.move("down");
            if(this.canMoveTetrimino(moved2)){
                moved = moved2.clone();
            }else{
                ret = moved;
                end = true;
            }
        }while(!end)
        return ret;
    }
}

// フィールドに表示されるブロックのクラス
class Block{
    // bool isBlock: ブロックであるかどうか
    // string color: Colorsで定義された色を示す文字列
    // bool isRockedDown 既にロックダウンしているかどうか
    constructor(isBlock, color = "default", isRockedDown = false, ghost = false){
        this.isBlock = isBlock;
        this.color = color;
        this.isRockedDown = isRockedDown;
        this.ghost = ghost;
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
            return this.reserveSets[refSet][refIndex];
        }
    }
}

class Points{
    constructor(){
        this.line = 0;
        this.point = 0;
    }

    add(line, ren, backToBack = false){
        this.line += line;
        line = line > 5 ? 5 : line;
        ren = ren > 5 ? 5 : ren;
        var addpoint = PointTable.line[line] * PointTable.ren[ren];
        if(backToBack){
            addpoint *= PointTable.backToBack;
        }
        this.point += addpoint;
    }

    perfectClear(){
        this.point += PointTable.perfectClear;
    }
}

class ShowPointTable{
    constructor(){
        this.isMade = false;
    }

    make(jqueryObj){
        jqueryObj
            .append("<tbody id=\"pointTableTbody\" />");
        $("#pointTableTbody")
            .append("<tr id=\"pointTableLineTr\" />")
            .append("<tr id=\"pointTablePointTr\" />");
        $("#pointTableLineTr")
            .append("<th id=\"pointTableLineHead\" />")
            .append("<td id=\"pointTableLineValue\" />");
        $("#pointTablePointTr")
            .append("<th id=\"pointTablePointHead\" />")
            .append("<td id=\"pointTablePointValue\" />");
        $("#pointTableLineHead").text("LINE:");
        $("#pointTablePointHead").text("POINT:");
        this.lineValueObj = $("#pointTableLineValue");
        this.pointValueOBj = $("#pointTablePointValue");
        this.isMade = true;
        this.show({ line: 0, point: 0 });
    }

    show(points){
        if(!this.isMade){
            return;
        }
        this.lineValueObj.text(points.line);
        this.pointValueOBj.text(points.point);
    }
}

class ShowEffectTable{
    constructor(){
        this.ren = 0;
        this.tetris = false;
        this.tSpin = false;
        this.perfectClear = false;
        this.backToBack = false;
        this.isMade = false;
    }

    make(jqueryObj){
        jqueryObj
            .append("<tbody id=\"showEffectTbody\" />");
        $("#showEffectTbody")
            .append("<tr id=\"showEffectRenTr\" />")
            .append("<tr id=\"showEffectTetrisTr\" />")
            .append("<tr id=\"showEffectPerfectClearTr\" />")
            .append("<tr id=\"showEffectBackToBackTr\" />");
        $("#showEffectRenTr")
            .append("<td id=\"showEffectRenValue\" />");
        $("#showEffectTetrisTr")
            .append("<td id=\"showEffectTetrisValue\" />");
        $("#showEffectPerfectClearTr")
            .append("<td id=\"showEffectPerfectClearValue\" />");
        $("#showEffectBackToBackTr")
            .append("<td id=\"showEffectBackToBackValue\" />");
        this.tetrisObj = $("#showEffectTetrisValue");
        this.renObj = $("#showEffectRenValue");
        this.perfectClearObj = $("#showEffectPerfectClearValue");
        this.tetrisObj.text("TETRIS!");
        this.backToBackObj = $("#showEffectBackToBackValue");
        this.backToBackObj.text("Back to Back!");
        this.perfectClearObj.text("PERFECT CLEAR!");
        this.isMade = true;
        this.show();
    }

    show(){
        if(!this.isMade){
            return;
        }
        if(this.ren == 0){
            this.renObj.css({ "visibility": "hidden" });
        }else{
            this.renObj
                .text("{0} REN".format(this.ren))
                .css({ "visibility": "" });
        }
        if(this.tetris){
            this.tetrisObj.css({ "visibility": "" });
        }else{
            this.tetrisObj.css({ "visibility": "hidden" });
        }
        if(this.perfectClear){
            this.perfectClearObj.css({ "visibility": "" });
        }else{
            this.perfectClearObj.css({ "visibility": "hidden" });
        }
        if(this.backToBack){
            this.backToBackObj.css({ "visibility": "" });
        }else{
            this.backToBackObj.css({ "visibility": "hidden" });
        }
    }
}

class InfoArea{
    constructor(jqueryObj){
        this.messages = [];
        this.jqueryObj = jqueryObj;
        this.jqueryObj.css({ "height": "3em" });
    }

    show(){
        this.jqueryObj.empty();
        this.messages.forEach((value)=>{
            this.jqueryObj.append("<p>" + value + "</p>");
        });
    }

    addMessage(message){
        this.messages.push(message);
        this.show();
    }

    clearMessage(){
        this.messages = [];
        this.show();
    }
}

class Server{
    constructor(buttonObj, nameInputObj, roomsSelectObj){
        this.roomsSelectObj = roomsSelectObj;
        this.buttonObj = buttonObj;
        this.nameInputObj = nameInputObj;
        this.isConnecting = false;
        if(!Server.isEnable()){
            this.buttonObj
                .text("サーバーが利用できません")
                .prop("disabled", true);
            this.roomsSelectObj
                .prop("disabled", true);
            this.nameInputObj
                .prop("disabled", true);
        }else{
            this.makeRoomSelect();
            this.buttonObj
                .text("サーバーに接続")
                .on("click", ()=>{
                    this.playerName = this.nameInputObj.val();
                    var room = this.roomsSelectObj.val();
                    this.join(room);
                });
            this.connect();
        }
    }

    makeRoomSelect(){
        $.getJSON("/game/rooms", (data)=>{
            data.forEach((value)=>{
                this.roomsSelectObj
                    .append("<option value=\"{0}\">{0}</option>".format(value));
            });
        });
    }

    connect(){
        this.playerName = this.nameInputObj.val();
        this.socket = io.connect();
        this.isConnecting = true;
        this.socket.on("ditributionPlayerScores", (data)=>{
            this.playerTable.show(data);
        });
        this.socket.on("playerListChanged", (data)=>{
            this.playerList = JSON.parse(data);
            this.playerList.forEach((value)=>{
                // this.playerTable.scores[value] = new Points();
                // if(!(value in this.playerTable.scores)){
                    // this.playerTable.scores.push(value);
                // }
            });
            this.playerTable.playerList = this.playerList;
            this.playerTable.makeBody();
        });
        this.playerTable = new PlayerRankingTable();
        this.playerTable.make($("#players"));
    }

    join(roomName){
        this.socket.emit("playerJoinToRoom", {
            name: this.playerName,
            roomName: roomName
        });
        this.socket.emit("getPlayerList", {}, (data)=>{
            this.playerList = data;
            this.playerList.forEach((value)=>{
                // this.playerTable.scores[this.playerTable.scores.length]
                //     = new Points();
                // this.playerTable.scores.push(new Points());
            });
            this.playerTable.playerList = this.playerList;
            this.playerTable.makeBody();
        });
    }

    submitScore(points){
        if(!this.isConnecting){
            return;
        }
        var data = {
            name: this.playerName,
            score: {
                line: points.line,
                point: points.point
            }
        };
        this.socket.emit("submitScore", data);
    }

    static isEnable(){
        return !(typeof io === "undefined");
    }
}

class PlayerRankingTable{
    constructor(){
        // this.scores = [];
        this.objs = [];
        this.playerList = [];
    }

    make(jqueryObj){
        jqueryObj
            .append("<thead id=\"playersThead\" />")
            .append("<tbody id=\"playersTbody\" />");
        $("#playersThead")
            .append("<th>順位</th><th>プレイヤー名</th><th>LINE</th><th>スコア</th>");
        this.tbody = $("#playersTbody");
    }

    makeBody(){
        this.tbody.empty();
        var rankNum = 1;
        this.objs = [];
        Object.keys(this.playerList).forEach((value)=>{
            var obj = {};
            this.tbody.append("<tr>");
            this.tbody.append("<td>"+ rankNum +"</td>");
            this.tbody.append("<td id=\"{0}-name\">{1}</td>"
                .format(rankNum, value));
            this.tbody.append("<td id=\"{0}-line\">0</td>"
                .format(rankNum));
            this.tbody.append("<td id=\"{0}-point\">0</td>"
                .format(rankNum));
            this.tbody.append("</tr>");
            obj.name = $("#{0}-name".format(rankNum));
            obj.line = $("#{0}-line".format(rankNum));
            obj.point = $("#{0}-point".format(rankNum));
            this.objs[rankNum - 1] = obj;
            rankNum++;
        })
    }

    show(data){
        var dataobj = JSON.parse(data);
        var rankNum = 1;
        dataobj.forEach((value, index)=>{
            // this.scores[value.name] = value.scores;
            // this.objs[value.name].line.text(value.scores.line);
            // this.objs[value.name].point.text(value.scores.point);
            // console.log(this.objs);
            // this.scores[rankNum] = value.scores;
            this.objs[rankNum - 1].name.text(value.name);
            this.objs[rankNum - 1].line.text(value.scores.line);
            this.objs[rankNum - 1].point.text(value.scores.point);
            rankNum++;
        });
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
    "T": "#673AB7",
    "gameOvered": "#848484"
};

// ゴーストの色
var GhostColors = {
    "default": "#ffffff",
    "I": "#81CCEE",
    "O": "#FFF595",
    "S": "#ABC48E",
    "Z": "#FFB098",
    "J": "#7982B1",
    "L": "#FFDAA0",
    "T": "#9887B5"
};


// 操作キー
var Keys = {
    87: "up",
    65: "left",
    83: "down",
    68: "right",
    37: "antiClockwize",
    38: "clockwize",
    16: "hold",
    13: "enter"
};

// ポイントテーブル
var PointTable = {
    // 一度に消したラインでのポイント数
    line: {
        1: 100,
        2: 200,
        3: 300,
        4: 600
    },
    // RENの数ごとの倍率
    // 5以降は5の倍率を用いる
    ren: {
        0: 1.0,
        1: 1.2,
        2: 1.4,
        3: 1.6,
        4: 1.8,
        5: 2.0
    },
    // パーフェクトクリアした場合のボーナス
    perfectClear: 1000,
    // Back to Backの倍率
    backToBack: 1.2
}

App.main();