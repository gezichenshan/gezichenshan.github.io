// var Select = {
//     createNew: function() {　　　　　　
//         var item = {};
//         item.name = "大毛";
//         // this.interval = {}
//         item.starRandom = function() {
//             let items = document.getElementsByClassName('item')
//             let count = items.length
//             this.interval = setInterval(function(){
//             	for(let i=0;i<items.length;i++){
//             		items[i].style.setProperty('background', '#fda529');
//             	}
// 	            var arr = [];
// 	            while (arr.length < 3) {
// 	                var bFlag = true;
// 	                var number = Math.floor(Math.random() * count);
// 	                for (var i = 0; i < arr.length; i++) {
// 	                    if (number == arr[i]) {
// 	                        bFlag = false;
// 	                    }
// 	                }
// 	                if (bFlag) {
// 	                    arr.push(number);
// 	                }
// 	            }
//             	for(let i=0;i<3;i++){
// 	            	let color = item.getRandomColor()
// 	            	for(let j=0;j<arr.length;j++){
// 	            		let eleIndex = arr[j]
// 	            		items[eleIndex].style.setProperty('background', color);
// 	            	}
// 	            }
//             },1000)
//         };
//         item.getRandomColor = function() {
//         	var hex = Math.floor(Math.random() * 16777216).toString(16); //生成ffffff以内16进制数
//             while (hex.length < 6) { //while循环判断hex位数，少于6位前面加0凑够6位
//                 hex = '0' + hex;
//             }
//             return '#' + hex; //返回‘#'开头16进制颜色
//         }
//         item.stop = function(){
//         	console.log(item)
//         	clearInterval(this.interval)
//         }
//         return item
//     }
// }
var btnAction = {
    interval : '',
    start:function(){
        if(!this.interval){
            this.changeColor()
            let self = this
            this.interval = setInterval(function(){
                self.changeColor()
            },1000)
        }
        
    },
    stop:function(){
        let items = document.getElementsByClassName('item')
        for(let i=0;i<items.length;i++){
            items[i].style.setProperty('background', '#fda529');
        }
        clearInterval(this.interval)
    },
    getRandomColor : function() {
     var hex = Math.floor(Math.random() * 16777216).toString(16); //生成ffffff以内16进制数
        while (hex.length < 6) { //while循环判断hex位数，少于6位前面加0凑够6位
            hex = '0' + hex;
        }
        return '#' + hex; //返回‘#'开头16进制颜色
    },
    changeColor : function(){
        let items = document.getElementsByClassName('item')
        let count = items.length
        for(let i=0;i<items.length;i++){
            items[i].style.setProperty('background', '#fda529');
        }
        var arr = [];
        while (arr.length < 3) {//取1-9的三个随机数，对应9个格子
            var bFlag = true;
            var number = Math.floor(Math.random() * count);
            for (let i = 0; i < arr.length; i++) {
                if (number == arr[i]) {
                    bFlag = false;
                }
            }
            if (bFlag) {
                arr.push(number);
            }
        }
        for(let i=0;i<3;i++){
            let color = this.getRandomColor()
            for(let j=0;j<arr.length;j++){
                let eleIndex = arr[j]
                items[eleIndex].style.setProperty('background', color);
            }
        }
    }
}