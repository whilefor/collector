 /**
 * collector.js v0.0.1
 *
 * Copyright (c) 2015-2015 Whilefor <whilefor@outlook.com>
 * Open source under the MIT License.
 * while4.com
 */
(function(window, document) {
    //'use strict';

    var 
        document           = window.document,
        DocumentFragment   = window.DocumentFragment   || blank,
        SVGElement         = window.SVGElement         || blank,
        SVGSVGElement      = window.SVGSVGElement      || blank,
        SVGElementInstance = window.SVGElementInstance || blank,
        HTMLElement        = window.HTMLElement        || window.Element,

        wapper_className    = "c-wapper",
        dashboard_className   = "c-dashboard",
        widget_className         = "c-widget",

        PointerEvent = (window.PointerEvent || window.MSPointerEvent),
        pEventTypes,

        hypot = Math.hypot || function (x, y) { return Math.sqrt(x * x + y * y); },

        tmpXY = {},     // reduce object creation in getXY()

        documents       = [],   // all documents being listened to

        dynamicDrop     = false,

        delegatedEvents = {},




        collectors   = [],   // all set collectors
        defaultOptions = {
            base: {
                width:"10000px",
                height:"10000px",
                maxScale:1,
                minScale:0.1,
                scaling:0.1 //递增度
            },

            drag: {
                enabled: false,
                manualStart: true,
                max: Infinity,
                maxPerElement: 1,

                snap: null,
                restrict: null,
                inertia: null,
                autoScroll: null,

                axis: 'xy',
            }
        };

    function collector (element, options) {
        return new c(element, options);
    }

    function c (element ,options) {
        //参数赋值
        var options = options;
        if(!options){
            options = defaultOptions.base;
        }
        else{
            options = mergeObj(defaultOptions.base, options);
        }

        //----------------处理选择器-----------------//
        //------暂时只支持匹配选择器的第一个元素-----//
        if (isSelector(element)) {           //".collection" || "#collection"
            this._selector = element;
            //返回匹配指定选择器的第一个元素
            this.element  = document.querySelector(element);
        }
        else{
            //单Node节点
            //if (isElement(element)) {

                // if (PointerEvent) {
                //     events.add(this._element, pEventTypes.down, listeners.pointerDown );
                //     events.add(this._element, pEventTypes.move, listeners.pointerHover);
                // }
                // else {
                //     events.add(this._element, 'mousedown' , listeners.pointerDown );
                //     events.add(this._element, 'mousemove' , listeners.pointerHover);
                //     events.add(this._element, 'touchstart', listeners.pointerDown );
                //     events.add(this._element, 'touchmove' , listeners.pointerHover);
                // }
            //}
            //多Node节点
            //if(isHTMLCollection(element)){

            //}
        }
        this._options = options;


        //----------------初始化-----------------//
        if(this.element){
            this._init();
        }
        else{
            console.error("element of options not found");
        }
    };
    c.prototype = {
        _init: function (){
            this.scale = this._options.minScale;
            this.scaling = this._options.scaling;
            this.minScale = this._options.minScale;
            this.maxScale = this._options.maxScale;

            var width = this._options.width,
                height = this._options.height;

            //create html elements
            var collectorElements = createCollectorTemplate(width,height,this.minScale);
            this.wapperElement    = collectorElements.wapperElement;
            this.dashboardElement = collectorElements.dashboardElement;

            //render, put the wapper element into the selected element
            this.element.appendChild(collectorElements.wapperElement);

            //bind Event
            //widget dragable
            EventUtil.addHandler(this.element, "mousewheel", this._onScale.bind(this) );
            EventUtil.addHandler(this.element, "mousedown",  this._onDashboardDrag.bind(this) );
            EventUtil.addHandler(this.element, "mousedown",  this._onWidgetDrag.bind(this) );

            //draggable element into dashboard
            EventUtil.addHandler(this.element, "dragenter", this._onElementDragenter.bind(this) );
            EventUtil.addHandler(this.element, "dragover",  this._onElementDragover.bind(this) );
            EventUtil.addHandler(this.element, "drop",      this._onElementDrop.bind(this) );
            EventUtil.addHandler(this.element, "dragleave", this._onElementDragleave.bind(this) );
        },
        _onElementDragenter: function(event){
            var e = EventUtil.getEvent(event);
            e.preventDefault();
            e.stopPropagation();
        },
        _onElementDragover: function(event){
            var e = EventUtil.getEvent(event);
            e.preventDefault();
            e.stopPropagation();
        },
        _onElementDrop: function(event){
            var e = EventUtil.getEvent(event);
            e.preventDefault();
            e.stopPropagation();
        },
        _onElementDragleave: function(event){
            var e = EventUtil.getEvent(event);
            e.preventDefault();
            e.stopPropagation();
        },
        _onScale: function(event){
            var e = EventUtil.getEvent(event),
                delta = EventUtil.getWheelDelta(event);
            e.preventDefault();
            e.stopPropagation();

            var wapperElement = this.wapperElement,
                dashboardElement = this.dashboardElement,
                element = this.element;

             //判断滚轮放大或缩小, 以scaleSize/10为单位放大或缩小
            if (delta > 0) {
                //放大
                if (this.scale < this.maxScale) {
                    var oldscale = this.scale;
                    this.scale = actAdd(this.scale,this.scaling);
                    this.scale > this.maxScale?this.scale = this.maxScale:''; 
                    //放大
                    wapperElement.style.transform = "scale(" + this.scale + ")";

                    //获取以鼠标为中心放大后需要移动的距离
                    var OffsetLeft = this._offsetLeftAfterScaling (e,oldscale,this.scale);
                    var OffsetTop  = this._offsetTopAfterScaling  (e,oldscale,this.scale);

                    //相对移动
                    if(OffsetLeft){
                        dashboardElement.style.left = OffsetLeft + "px";
                    }
                    else{
                        console.log("_onScale error"," - OffsetLeft");
                    }
                    if(OffsetTop){
                        dashboardElement.style.top  = OffsetTop  + "px";
                    }
                    else{
                        console.log("_onScale error"," - OffsetTop");
                    }
                }
            }
            else {
                //缩小
                if(this.scale > this.minScale){
                    var oldscale = this.scale;
                    this.scale = actAdd(this.scale, -this.scaling);
                    this.scale < this.minScale?this.scale = this.minScale:''; 
                    //缩小
                    wapperElement.style.transform = "scale(" + this.scale + ")";

                    //获取以鼠标为中心放大后需要移动的距离
                    var OffsetLeft = this._offsetLeftAfterScaling(e,oldscale,this.scale);
                    var OffsetTop  = this._offsetTopAfterScaling(e,oldscale,this.scale);

                    //相对移动
                    dashboardElement.style.left = OffsetLeft + "px";
                    dashboardElement.style.top  = OffsetTop  + "px";
                }
            }

            //css scale
            scaleRate = actDivision(1,this.scale);

            //防止滚动后出边界
            var dashboardTop = parseInt(dashboardElement.style.top) || 0;
            var dashboardLeft = parseInt(dashboardElement.style.left) || 0;
            var dashboardWidth = parseInt(dashboardElement.offsetWidth);
            var dashboardHeight = parseInt(dashboardElement.offsetHeight);
            var elementWidth = parseInt(element.offsetWidth);
            var elementHeight = parseInt(element.offsetHeight);
            var maxTop = -(dashboardHeight - elementHeight * scaleRate);
            var maxLeft = -(dashboardWidth - elementWidth * scaleRate);
            if(dashboardTop <= 0){
                (Math.abs(dashboardTop) + elementHeight * scaleRate) >= dashboardHeight
                ? dashboardElement.style.top = maxTop + "px" : "";
            }
            else{
                dashboardElement.style.top = "0px"
            }
            if(dashboardLeft <= 0){
                (Math.abs(dashboardLeft) + elementWidth * scaleRate) >= dashboardWidth
                ? dashboardElement.style.left = maxLeft + "px" : "";
            }
            else{
                dashboardElement.style.left = "0px";
            }
        },
        _onWidgetDrag: function(event){
            var e = EventUtil.getEvent(event);

            var wapperElement = this.wapperElement,
                dashboardElement = this.dashboardElement,
                element = this.element,
                target = e.target;
            this.target = e.target;

            //var scaleRate = actDivision(this.multiple, this.scale);
            scaleRate = actDivision(1,this.scale);

            if(isWidgetElement(target)){
                target.offset_x = e.clientX * scaleRate - target.offsetLeft;
                target.offset_y = e.clientY * scaleRate - target.offsetTop;
                console.log("dragstart");
                document.onmousemove = this._onWidgetDraging.bind(this);
                document.onmouseup = this._onWidgetDragend.bind(this);
                //EventUtil.addHandler(document, "mousemove",  this._onWidgetDraging.bind(this) );
                //EventUtil.addHandler(document, "mouseup",    this._onWidgetDragend.bind(this) );
            }
        },
        _onWidgetDraging: function(event){
            var e = EventUtil.getEvent(event);
            var target = this.target,
                wapperElement = this.wapperElement,
                dashboardElement = this.dashboardElement,
                element = this.element;

            target.style.cursor = "pointer";
            target.style.position = "absolute";
            var scaleSize = this.scale;
            //var scaleRate = actDivision(this.multiple,scaleSize);
            scaleRate = actDivision(1,this.scale);


            var targetTop = parseInt(target.style.top) || 0;
            var targetLeft = parseInt(target.style.left) || 0;

            var targetWidth = parseInt(target.offsetWidth);
            var targetHeight = parseInt(target.offsetHeight);

            var containerWidth = parseInt(element.offsetWidth);
            var containerHeight = parseInt(element.offsetHeight);

            var top = e.clientY * scaleRate - target.offset_y;
            var left = e.clientX * scaleRate - target.offset_x;

            //防止widget出dashboard边界
            var dashboardWidth = target.parentNode.offsetWidth;
            var dashboardHeight = target.parentNode.offsetHeight;

            var maxTop = dashboardHeight - targetHeight;
            var maxLeft = dashboardWidth - targetWidth;

            if(top > 0){
              (top + targetHeight) >= dashboardHeight
                ? target.style.top = maxTop + "px" : target.style.top = top+ "px";
            }
            else{
              target.style.top = "0px"
            }

            if(left >0){
              (left + targetWidth) >= dashboardWidth
                ? target.style.left = maxLeft + "px" : target.style.left = left + "px";
            }
            else{
              target.style.left = "0px";
            }
        },
        _onWidgetDragend: function(event){
            //event.stopPropagation();
            console.log("dragend");
            //EventUtil.removeHandler(document,"mousemove",this._onWidgetDraging.bind(this)  );
            //EventUtil.removeHandler(document,"mouseup",  this._onWidgetDragend.bind(this) );
            document.onmouseup = null;
            document.onmousemove = null;
        },
        _onDashboardDrag: function(event){
            var e = EventUtil.getEvent(event);

            var wapperElement = this.wapperElement,
                dashboardElement = this.dashboardElement,
                element = this.element,
                target = e.target;
            this.target = e.target;

            //var scaleRate = actDivision(this.multiple, this.scale);
            scaleRate = actDivision(1,this.scale);

            if(isDashboardElement(target)){
                target.offset_x = e.clientX * scaleRate - target.offsetLeft;
                target.offset_y = e.clientY * scaleRate - target.offsetTop;
                document.onmousemove = this._onDashboardDraging.bind(this);
                document.onmouseup = this._onDashboardDragend.bind(this);
                //EventUtil.addHandler(document, "mousemove",  this._onDashboardDraging.bind(this) );
                //EventUtil.addHandler(document, "mouseup",    this._onDashboardDragend.bind(this) );
            }
        },
        _onDashboardDraging: function(event){
            var e = EventUtil.getEvent(event);
            var target = this.target,
                wapperElement = this.wapperElement,
                dashboardElement = this.dashboardElement,
                element = this.element;

            target.style.cursor = "pointer";
            target.style.position = "absolute";
            var scaleSize = this.scale;
            //var scaleRate = actDivision(this.multiple,scaleSize);
            scaleRate = actDivision(1,this.scale);


            var targetTop = parseInt(target.style.top) || 0;
            var targetLeft = parseInt(target.style.left) || 0;

            var targetWidth = parseInt(target.offsetWidth);
            var targetHeight = parseInt(target.offsetHeight);

            var containerWidth = parseInt(element.offsetWidth);
            var containerHeight = parseInt(element.offsetHeight);

            var top = e.clientY * scaleRate - target.offset_y;
            var left = e.clientX * scaleRate - target.offset_x;

            //防止dashboard出container边界
            var maxTop = -(targetHeight - containerHeight * scaleRate);
            var maxLeft = -(targetWidth - containerWidth * scaleRate);
            if(top <= 0){
              (Math.abs(top) + containerHeight * scaleRate) >= targetHeight
                ? target.style.top = maxTop + "px" : target.style.top = top+ "px";
            }
            else{
              target.style.top = "0px"
            }

            if(left <=0){
              (Math.abs(left) + containerWidth * scaleRate) >= targetWidth
                ? target.style.left = maxLeft + "px" : target.style.left = left + "px";
            }
            else{
              target.style.left = "0px";
            }
        },
        _onDashboardDragend: function(event){
            document.onmouseup = document.onmousemove = null;
        },
        _offsetLeftAfterScaling: function(e,oldScale,newScale){
            var wapperElement    = this.wapperElement,
                dashboardElement = this.dashboardElement,
                element          = this.element;

            var width = parseInt(element.style.width) || parseInt(element.offsetWidth),
                wapperX = this._getClientLeft(element),
                oX = parseInt(dashboardElement.style.left) || 0 ,
                pageX = this._getPageX(e);
            //var Bx = ((pageX-wapperX) - oX * (oldScale/10.0)) / (width * (oldScale/10.0));
            //var newX = ((pageX-wapperX) - (Bx * width * (newScale/10.0))  ) * (10.0 / newScale);
            var Bx = ((pageX - wapperX) - oX * (oldScale)) / (width * (oldScale));
            var newX  = ((pageX-wapperX) - (Bx * width * (newScale))  ) * (1 / newScale);
            //var Bx = actDivision(  actAdd(  actAdd(pageX, - wapperX), - actMultiply(oX,oldScale)) , actMultiply(width,oldScale));
            //var newX  = actMultiply(  actAdd(  actAdd(pageX, -wapperX), - actMultiply(actMultiply(Bx,width),newScale)  ),actDivision(1 , newScale));


            return newX;
        },
        _offsetTopAfterScaling: function(e,oldScale,newScale){
            var wapperElement    = this.wapperElement,
                dashboardElement = this.dashboardElement,
                element          = this.element;

            var height = parseInt(element.style.height) || parseInt(element.offsetHeight),
                oY = parseInt(dashboardElement.style.top) || 0,
                wapperY = this._getClientTop(element),
                pageY = this._getPageY(e);
            //var By = ((pageY-wapperY) - oY * (oldScale/10.0)) / (height * (oldScale/10.0));
            //var newY = ((pageY-wapperY) - (By * height * (newScale/10.0))  ) * (10.0 / newScale);
             var By = ((pageY-wapperY) - oY * (oldScale)) / (height * (oldScale));
             var newY = ((pageY-wapperY) - (By * height * (newScale))  ) * (1 / newScale);
            //var By = actDivision(  actAdd(  actAdd(pageY,-wapperY), - actMultiply(oY , oldScale)) , actMultiply(height , oldScale));
            //var newY = actMultiply(  actAdd( actAdd(pageY,-wapperY), - actMultiply(actMultiply(By,height),newScale)  ) ,actDivision(1 , newScale));
            return newY;
        },
        _getClientTop: function(element){
            var offset = element.offsetTop;
            if(element.offsetParent!=null) offset += arguments.callee(element.offsetParent);
            return offset;
        },
        _getClientLeft: function(element){
            var offset = element.offsetLeft;
            if(element.offsetParent!=null) offset += arguments.callee(element.offsetParent);
            return offset;
        },
        _getPageX: function(event){
            if ( event.pageX == null && event.clientX !=  null ) {
                var doc = document.documentElement, body = document.body;
                return event.clientX + (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc && doc.clientLeft  || body && body.clientLeft || 0);
              //event.pageY = event.clientY + (doc && doc.scrollTop  ||  body && body.scrollTop  || 0) - (doc && doc.clientTop  || body && body.clientTop  || 0);
            }
            return event.pageX;
        },
        _getPageY: function(event){
            if ( event.pageX == null && event.clientX !=  null ) {
                var doc = document.documentElement, body = document.body;
                //event.pageX = event.clientX + (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc && doc.clientLeft  || body && body.clientLeft || 0);
                return event.clientY + (doc && doc.scrollTop  ||  body && body.scrollTop  || 0) - (doc && doc.clientTop  || body && body.clientTop  || 0);
            }
            return event.pageY;
        }
    };
    c.prototype.constructor = c;

    function isWapperElement (elem){
        if(hasClass(elem,'c-wapper')){
            return true;
        }
        return false;
    }
    function isDashboardElement (elem){
        if(hasClass(elem,'c-dashboard')){
            return true;
        }
        return false;
    }
    function isWidgetElement (elem){
        if(hasClass(elem,'c-widget')){
            return true;
        }
        return false;
    }
    function hasClass(dom, className) {
        className = className.replace(/^\s|\s$/g, "")
        return (
            " " + ((dom || {}).className || "").replace(/\s/g, " ") + " "
        ).indexOf(" " + className + " ") >= 0
    }
    function actDivision(arg1,arg2){
        var t1=0,t2=0,r1,r2;
        try{t1=arg1.toString().split(".")[1].length}catch(e){}
        try{t2=arg2.toString().split(".")[1].length}catch(e){}
          r1=Number(arg1.toString().replace(".",""));
          r2=Number(arg2.toString().replace(".",""));
          return (r1/r2)*Math.pow(10,t2-t1);
    }
    function actMultiply(arg1,arg2){
        arg1=String(arg1);var i=arg1.length-arg1.indexOf(".")-1;i=(i>=arg1.length)?0:i;
        arg2=String(arg2);var j=arg2.length-arg2.indexOf(".")-1;j=(j>=arg2.length)?0:j;
        return arg1.replace(".","")*arg2.replace(".","")/Math.pow(10,i+j);
    }
    function actAdd(arg1,arg2){
        var r1,r2,m;
        try{r1=arg1.toString().split(".")[1].length}catch(e){r1=0}
        try{r2=arg2.toString().split(".")[1].length}catch(e){r2=0}
        m=Math.pow(10,Math.max(r1,r2));
        return (arg1*m+arg2*m)/m;
    }


    function blank () {}
    function createCollectorTemplate(width,height,scale){
        var width = width || "10000px";
        var height = height || "10000px";

        //wapper
        var wapperElement = document.createElement('div');
        wapperElement.className = 'c-wapper';
        wapperElement.style.width = width;
        wapperElement.style.height = height;
        wapperElement.style.transform = 'scale(' + scale + ')';

        //dashboard
        var dashboardElement = document.createElement('div');
        dashboardElement.className = 'c-dashboard';
        wapperElement.appendChild(dashboardElement);

        //widget for test
        var testWidget = document.createElement('div');
        testWidget.className = 'c-widget';
        dashboardElement.appendChild(testWidget);

        return {
            'wapperElement':wapperElement,
            'dashboardElement':dashboardElement
            };
    }

    function isElement (obj) {
        return !!(obj && obj.nodeType === 1);
    }
    function isHTMLCollection (obj) {
        if(obj.toString()== '[object HTMLCollection]' || 
           obj.toString()== '[object NodeList]' ){
            return true;
        }
        return false;
    }
    function isWindow (thing) { return !!(thing && thing.Window) && (thing instanceof thing.Window); }
    function isDocFrag (thing) { return !!thing && thing instanceof DocumentFragment; }
    function isArray (thing) {
        return isObject(thing)
                && (typeof thing.length !== undefined)
                && isFunction(thing.splice);
    }
    function isObject   (thing) { return !!thing && (typeof thing === 'object'); }
    function isFunction (thing) { return typeof thing === 'function'; }
    function isNumber   (thing) { return typeof thing === 'number'  ; }
    function isBool     (thing) { return typeof thing === 'boolean' ; }
    function isString   (thing) { return typeof thing === 'string'  ; }
    function isSelector (value) {
        if (!isString(value)) { return false; }

        // an exception will be raised if it is invalid
        document.querySelector(value);
        return true;
    }
    function mergeObj() {
        var options,
            name,
            src,
            copy,
            copyIsArray,
            clone,
            target = arguments[0] || {},
            i = 1,
            length = arguments.length,
            deep = false;
     
        // Handle a deep copy situation
        if ( typeof target === "boolean" ) {
            deep = target;
            target = arguments[1] || {};
            // skip the boolean and the target
            i = 2;
        }
     
        // Handle case when target is a string or something (possible in deep copy)
        if ( typeof target !== "object" ) {
            target = {};
        }
     
        // 如果只有一个参数，那将意味着对jquery自身进行扩展
        if ( length === i ) {
            target = this;
            --i;
        }
     
        for ( ; i < length; i++ ) {
            // Only deal with non-null/undefined values
            if ( (options = arguments[ i ]) != null ) {
                // Extend the base object
                for ( name in options ) {
                    src = target[ name ];
                    copy = options[ name ];
     
                    // Prevent never-ending loop
                    if ( target === copy ) {
                        continue;
                    }
     
                    if ( copy !== undefined ) {
                        target[ name ] = copy;
                    }
                }
            }
        }
     
        // Return the modified object
        return target;
    };

    var client = function(){

        //rendering engines
        var engine = {            
            ie: 0,
            gecko: 0,
            webkit: 0,
            khtml: 0,
            opera: 0,

            //complete version
            ver: null  
        };
        
        //browsers
        var browser = {
            
            //browsers
            ie: 0,
            firefox: 0,
            safari: 0,
            konq: 0,
            opera: 0,
            chrome: 0,
            safari: 0,

            //specific version
            ver: null
        };

        
        //platform/device/OS
        var system = {
            win: false,
            mac: false,
            x11: false,
            
            //mobile devices
            iphone: false,
            ipod: false,
            ipad: false,
            ios: false,
            android: false,
            nokiaN: false,
            winMobile: false,
            
            //game systems
            wii: false,
            ps: false 
        };    

        //detect rendering engines/browsers
        var ua = navigator.userAgent;    
        if (window.opera){
            engine.ver = browser.ver = window.opera.version();
            engine.opera = browser.opera = parseFloat(engine.ver);
        } else if (/AppleWebKit\/(\S+)/.test(ua)){
            engine.ver = RegExp["$1"];
            engine.webkit = parseFloat(engine.ver);
            
            //figure out if it's Chrome or Safari
            if (/Chrome\/(\S+)/.test(ua)){
                browser.ver = RegExp["$1"];
                browser.chrome = parseFloat(browser.ver);
            } else if (/Version\/(\S+)/.test(ua)){
                browser.ver = RegExp["$1"];
                browser.safari = parseFloat(browser.ver);
            } else {
                //approximate version
                var safariVersion = 1;
                if (engine.webkit < 100){
                    safariVersion = 1;
                } else if (engine.webkit < 312){
                    safariVersion = 1.2;
                } else if (engine.webkit < 412){
                    safariVersion = 1.3;
                } else {
                    safariVersion = 2;
                }   
                
                browser.safari = browser.ver = safariVersion;        
            }
        } else if (/KHTML\/(\S+)/.test(ua) || /Konqueror\/([^;]+)/.test(ua)){
            engine.ver = browser.ver = RegExp["$1"];
            engine.khtml = browser.konq = parseFloat(engine.ver);
        } else if (/rv:([^\)]+)\) Gecko\/\d{8}/.test(ua)){    
            engine.ver = RegExp["$1"];
            engine.gecko = parseFloat(engine.ver);
            
            //determine if it's Firefox
            if (/Firefox\/(\S+)/.test(ua)){
                browser.ver = RegExp["$1"];
                browser.firefox = parseFloat(browser.ver);
            }
        } else if (/MSIE ([^;]+)/.test(ua)){    
            engine.ver = browser.ver = RegExp["$1"];
            engine.ie = browser.ie = parseFloat(engine.ver);
        }
        
        //detect browsers
        browser.ie = engine.ie;
        browser.opera = engine.opera;
        

        //detect platform
        var p = navigator.platform;
        system.win = p.indexOf("Win") == 0;
        system.mac = p.indexOf("Mac") == 0;
        system.x11 = (p == "X11") || (p.indexOf("Linux") == 0);

        //detect windows operating systems
        if (system.win){
            if (/Win(?:dows )?([^do]{2})\s?(\d+\.\d+)?/.test(ua)){
                if (RegExp["$1"] == "NT"){
                    switch(RegExp["$2"]){
                        case "5.0":
                            system.win = "2000";
                            break;
                        case "5.1":
                            system.win = "XP";
                            break;
                        case "6.0":
                            system.win = "Vista";
                            break;
                        case "6.1":
                            system.win = "7";
                            break;
                        default:
                            system.win = "NT";
                            break;                
                    }                            
                } else if (RegExp["$1"] == "9x"){
                    system.win = "ME";
                } else {
                    system.win = RegExp["$1"];
                }
            }
        }
        
        //mobile devices
        system.iphone = ua.indexOf("iPhone") > -1;
        system.ipod = ua.indexOf("iPod") > -1;
        system.ipad = ua.indexOf("iPad") > -1;
        system.nokiaN = ua.indexOf("NokiaN") > -1;
        system.winMobile = (system.win == "CE");
        
        //determine iOS version
        if (system.mac && ua.indexOf("Mobile") > -1){
            if (/CPU (?:iPhone )?OS (\d+_\d+)/.test(ua)){
                system.ios = parseFloat(RegExp.$1.replace("_", "."));
            } else {
                system.ios = 2;  //can't really detect - so guess
            }
        }
        
        //determine Android version
        if (/Android (\d+\.\d+)/.test(ua)){
            system.android = parseFloat(RegExp.$1);
        }
        
        //gaming systems
        system.wii = ua.indexOf("Wii") > -1;
        system.ps = /playstation/i.test(ua);
        
        //return it
        return {
            engine:     engine,
            browser:    browser,
            system:     system        
        };

    }();

    var EventUtil = {

        addHandler: function(element, type, handler){
            if (element.addEventListener){
                element.addEventListener(type, handler, false);
            } else if (element.attachEvent){
                element.attachEvent("on" + type, handler);
            } else {
                element["on" + type] = handler;
            }
        },
        
        getButton: function(event){
            if (document.implementation.hasFeature("MouseEvents", "2.0")){
                return event.button;
            } else {
                switch(event.button){
                    case 0:
                    case 1:
                    case 3:
                    case 5:
                    case 7:
                        return 0;
                    case 2:
                    case 6:
                        return 2;
                    case 4: return 1;
                }
            }
        },
        
        getCharCode: function(event){
            if (typeof event.charCode == "number"){
                return event.charCode;
            } else {
                return event.keyCode;
            }
        },
        
        getClipboardText: function(event){
            var clipboardData =  (event.clipboardData || window.clipboardData);
            return clipboardData.getData("text");
        },
        
        getEvent: function(event){
            return event ? event : window.event;
        },
        
        getRelatedTarget: function(event){
            if (event.relatedTarget){
                return event.relatedTarget;
            } else if (event.toElement){
                return event.toElement;
            } else if (event.fromElement){
                return event.fromElement;
            } else {
                return null;
            }
        
        },
        
        getTarget: function(event){
            return event.target || event.srcElement;
        },
        
        getWheelDelta: function(event){
            if (event.wheelDelta){
                return (client.engine.opera && client.engine.opera < 9.5 ? -event.wheelDelta : event.wheelDelta);
            } else {
                return -event.detail * 40;
            }
        },
        
        preventDefault: function(event){
            if (event.preventDefault){
                event.preventDefault();
            } else {
                event.returnValue = false;
            }
        },

        removeHandler: function(element, type, handler){
            if (element.removeEventListener){
                element.removeEventListener(type, handler, false);
            } else if (element.detachEvent){
                element.detachEvent("on" + type, handler);
            } else {
                element["on" + type] = null;
            }
        },
        
        setClipboardText: function(event, value){
            if (event.clipboardData){
                event.clipboardData.setData("text/plain", value);
            } else if (window.clipboardData){
                window.clipboardData.setData("text", value);
            }
        },
        
        stopPropagation: function(event){
            if (event.stopPropagation){
                event.stopPropagation();
            } else {
                event.cancelBubble = true;
            }
        }

    };
    window.collector = collector;

})(window, document);