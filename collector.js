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
        $                  = window.jQuery,
        document           = window.document,
        DocumentFragment   = window.DocumentFragment   || blank,
        SVGElement         = window.SVGElement         || blank,
        SVGSVGElement      = window.SVGSVGElement      || blank,
        SVGElementInstance = window.SVGElementInstance || blank,
        HTMLElement        = window.HTMLElement        || window.Element,

        wapper_className    = " c-wapper",
        dashboard_className   = " c-dashboard",
        widget_className         = " c-widget",
        file_widget_className    = " c-file-widget",
        img_widget_className     = " c-img-widget",
        txt_widget_className     = " c-txt-widget",
        url_widget_className     = " c-url-widget",

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

    function collector (selector, options) {
        return new c(selector, options);
    }

    function c (selector ,options) {
        //参数赋值
        var options = options;
        if(!options){
            options = defaultOptions.base;
        }
        else{
            options = $.extend(defaultOptions.base, options);
        }

        //----------------处理选择器-----------------//
        //------暂时只支持匹配选择器的第一个元素-----//
        if ($(selector).length > 0) {           //".collection" || "#collection"
            this._selector = selector;
            //返回匹配指定选择器的第一个元素
            this.$targetElement = $($(selector).get(0));
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
        if(this.$targetElement){
            this._init();
        }
        else{
            console.error("element of options not found");
        }
    };
    c.prototype = {
        _widgetsArray:[],
        $activeWidget:null,
        _init: function (){
            this.scale = this._options.minScale;
            this.scaling = this._options.scaling;
            this.minScale = this._options.minScale;
            this.maxScale = this._options.maxScale;
            var $targetElement = this.$targetElement;

            var width = this._options.width,
                height = this._options.height,
                widgetSelector = '.' + widget_className.trim(),
                dashboardSelector = '.' + dashboard_className.trim();
            this.widgetSelector = widgetSelector;

            //create elements
            var collectorElements = createCollectorTemplate(width,height,this.minScale);
            this.$wapperElement    = collectorElements.wapperElement;
            this.$dashboardElement = collectorElements.dashboardElement;

            //put the wapper element into the selected element
            this.$targetElement.append(collectorElements.wapperElement);

            //widget dragable
            $targetElement.on('mousewheel', this._onScale.bind(this));

            //Draggable.create(widgetSelector,{type:"top,left",throwProps:true});
            $targetElement.on('mousedown', this._onDashboardDrag.bind(this));
            $targetElement.on('mousedown', widgetSelector, this._onWidgetDrag.bind(this));

            //widget active
            $targetElement.on('mousedown', widgetSelector, this._onWidgetActive.bind(this));

            //drag widget into dashboard
            $targetElement.on('dragenter',  this._onElementDragenter.bind(this));
            $targetElement.on('dragover',   this._onElementDragover.bind(this));
            $targetElement.on('drop',       this._onElementDrop.bind(this));
            $targetElement.on('dragleave',  this._onElementDragleave.bind(this));
        },
        _onWidgetActive: function(event){
            event.preventDefault();
            event.stopPropagation();
            var scaleRate = actDivision(1, this.scale);
            if(this.$activeWidget){
                this.$activeWidget.removeClass('c-widget-active');
                this.$activeWidget.find('.c-widget-menu').remove();
            }
            $(event.currentTarget).addClass('c-widget-active');
            this.$activeWidget = $(event.currentTarget);

            //active menu
            var $menu = $("<div class='c-widget-menu'></div>");
            $menu.css('transform', "scale(" + scaleRate + ")");
            this.$activeWidget.append($menu);
            
        },
        _onElementDragenter: function(event){
            event.preventDefault();
            event.stopPropagation();
            this.$targetElement.addClass('c-dragover');
        },
        _onElementDragover: function(event){
            event.preventDefault();
            event.stopPropagation();
            var $targetElement = this.$targetElement;
            if(!$targetElement.hasClass('c-dragover')){
                $targetElement.addClass('c-dragover');
            }
        },
        _onElementDrop: function(event){
            event.preventDefault();
            event.stopPropagation();
            var $targetElement = this.$targetElement;

            $targetElement.removeClass('c-dragover');
            var $wapperElement    = this.$wapperElement,
                $dashboardElement = this.$dashboardElement,
                $targetElement   = this.$targetElement;

            var dataTransfer = event.originalEvent.dataTransfer;
            dataTransfer.effectAllowed = "copy";
            var url  = dataTransfer.getData("text/uri-list");
            var text = dataTransfer.getData("text/plain");
            var html = dataTransfer.getData("text/html");

            var widgets = null;
            if(dataTransfer.files.length > 0){
                this._createFileWidgets(dataTransfer.files);
                return;
            }
            if(url){
                console.log('url:',url);
                this._createUrlWidgets(url, event);
                return;
            }
            if(text){
                console.log('text:',text);
                this._createTextWidgets(text);
                return;
            }
            if(html){
                console.log('html:',html);
                //widgets = this._createHtmlWidgets(html);
                //return;
            }
        },
        _onElementDragleave: function(event){
            event.preventDefault();
            event.stopPropagation();
            this.$targetElement.removeClass('c-dragover');
        },
        _putWidgetInDashboard: function($widget, event){
            //position
            var scaleRate = actDivision(1, this.scale);
            var clientX = event.originalEvent.clientX;
            var clientY = event.originalEvent.clientY;

            var wx = this._getClientLeft(this.$wapperElement);
            var wy = this._getClientTop(this.$wapperElement);

            var tx = (clientX - wx) * scaleRate - parseInt(this.$dashboardElement.css('left'));
            var ty = (clientY - wy) * scaleRate - parseInt(this.$dashboardElement.css('top'));

            $widget.css('top',  ty + 'px');
            $widget.css('left', tx + 'px');
            this.$dashboardElement.append($widget);
            this._widgetsArray.push($widget);
            //new Draggable($widget,{type:"top,left"});
        },
        _createFileWidgets: function(files){
            var self = this;
            for(var i = 0; i < files.length; i++){
                var file = files[i];
                self._uploadFile(file, function(data){
                    var $widget;
                    $widget = $("<div></div>");
                    $widget.addClass(widget_className);
                    $widget.addClass(file_widget_className);
                    $widget.html( "<p>File information: <strong>" + data.fileName +
                                        "</strong> type: <strong>" + file.type +
                                        "</strong> size: <strong>" + file.size +
                                        "</strong> bytes</p>");
                    self._putWidgetInDashboard($widget);
                });
            }
        },
        _uploadFile: function(file,callback){
            if(typeof callback ==="function"){
                callback({fileName:'test',realName:"321"});
            }
        },
        _createUrlWidgets: function(url, event){
            var $widget;
            if(url){
                $widget = $("<div></div>");
                $widget.addClass(widget_className);
                $widget.addClass(url_widget_className);
                $widget.html( "<p>" + url + "</p>");
                this._putWidgetInDashboard($widget, event);
            }
            //img
        },
        _createTextWidgets: function(text){
            var $widget;
            if(text){
                $widget = $("<div></div>");
                $widget.addClass(widget_className);
                $widget.addClass(txt_widget_className);
                $widget.html( "<p>" + text + "</p>");
                this._putWidgetInDashboard($widget);
            }
        },
        _createHtmlWidgets: function(html){
            
        },
        _onScale: function(event){
            var delta = event.deltaY;
            event.preventDefault();
            event.stopPropagation();

            var $wapperElement = this.$wapperElement,
                $dashboardElement = this.$dashboardElement,
                $targetElement = this.$targetElement;

             //判断滚轮放大或缩小, 以scaleSize/10为单位放大或缩小
            if (delta > 0) {
                //放大
                if (this.scale < this.maxScale) {
                    var oldscale = this.scale;
                    this.scale = actAdd(this.scale,this.scaling);
                    this.scale > this.maxScale?this.scale = this.maxScale:''; 
                    //放大
                    $wapperElement.css('transform', "scale(" + this.scale + ")");

                    //获取以鼠标为中心放大后需要移动的距离
                    var OffsetLeft = this._offsetLeftAfterScaling (event,oldscale,this.scale);
                    var OffsetTop  = this._offsetTopAfterScaling  (event,oldscale,this.scale);

                    //相对移动
                    if(OffsetLeft){
                        $dashboardElement.css('left', OffsetLeft + "px");
                    }
                    else{
                        console.log("_onScale error"," - OffsetLeft");
                    }
                    if(OffsetTop){
                        $dashboardElement.css('top', OffsetTop + "px");
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
                    $wapperElement.css('transform', "scale(" + this.scale + ")");

                    //获取以鼠标为中心放大后需要移动的距离
                    var OffsetLeft = this._offsetLeftAfterScaling(event,oldscale,this.scale);
                    var OffsetTop  = this._offsetTopAfterScaling(event,oldscale,this.scale);

                    //相对移动
                    $dashboardElement.css('left', OffsetLeft + "px");
                    $dashboardElement.css('top', OffsetTop + "px");
                }
            }

            //css scale
            scaleRate = actDivision(1,this.scale);
            $('.c-widget-menu').css('transform', "scale(" + scaleRate + ")");

            //防止滚动后出边界
            var dashboardTop = parseInt($dashboardElement.css('top')) || 0;
            var dashboardLeft = parseInt($dashboardElement.css('left')) || 0;
            var dashboardWidth = parseInt($dashboardElement.width());
            var dashboardHeight = parseInt($dashboardElement.height());
            var elementWidth = parseInt($targetElement.width());
            var elementHeight = parseInt($targetElement.height());
            var maxTop = -(dashboardHeight - elementHeight * scaleRate);
            var maxLeft = -(dashboardWidth - elementWidth * scaleRate);
            if(dashboardTop <= 0){
                (Math.abs(dashboardTop) + elementHeight * scaleRate) >= dashboardHeight
                ? $dashboardElement.css('top', maxTop + "px") : "";
            }
            else{
                $dashboardElement.css('top', '0px');
            }
            if(dashboardLeft <= 0){
                (Math.abs(dashboardLeft) + elementWidth * scaleRate) >= dashboardWidth
                ? $dashboardElement.css('left', maxLeft + "px") : "";
            }
            else{
                $dashboardElement.css('left', '0px');
            }
        },
        _onWidgetDrag: function(event){
            var $wapperElement = this.$wapperElement,
                $dashboardElement = this.$dashboardElement,
                $target = $(event.currentTarget);
            //传递给_onWidgetDraging和_onWidgetDragend
            this.$target = $target;

            //stop animation
            TweenMax.killAll();
            //animation init 
            this.perMoveX = 0;  
            this.perMoveY = 0;
            this.lastX = 0;
            this.lastY = 0;


            scaleRate = actDivision(1,this.scale);
            if(isWidgetElement($target)){
                this.offset_x = event.clientX * scaleRate - event.currentTarget.offsetLeft;
                this.offset_y = event.clientY * scaleRate - event.currentTarget.offsetTop;
                //console.log( event.currentTarget.offsetLeft, event.currentTarget.offsetTop,"widget");
                document.onmousemove = this._onWidgetDraging.bind(this);
                document.onmouseup = this._onWidgetDragend.bind(this);
            }
        },
        _onWidgetDraging: function(event){
            var $target = this.$target,
                $wapperElement = this.wapperElement,
                $dashboardElement = this.dashboardElement,
                $targetElement = this.$targetElement;

            var scaleSize = this.scale;
            scaleRate = actDivision(1,this.scale);

            //鼠标距离wigget的距离
            var mouseLeft = event.clientX - this.offset_x;
            var mouseTop = event.clientY - this.offset_y;
            //move间隔移动的距离
            this.perMoveX = (mouseLeft - this.lastX);  
            this.perMoveY = (mouseTop - this.lastY);
            this.lastX = mouseLeft;
            this.lastY = mouseTop;


            var targetTop = parseInt($target.css('top')) || 0;
            var targetLeft = parseInt($target.css('left')) || 0;

            var targetWidth = parseInt($target.width());
            var targetHeight = parseInt($target.height());

            var containerWidth = parseInt($targetElement.width());
            var containerHeight = parseInt($targetElement.height());

            var top = event.clientY * scaleRate - this.offset_y;
            var left = event.clientX * scaleRate - this.offset_x;

            //防止widget出dashboard边界
            var dashboardWidth = $target.parent().width();
            var dashboardHeight = $target.parent().height();

            var maxTop = dashboardHeight - targetHeight;
            var maxLeft = dashboardWidth - targetWidth;

            boundsLimit({
                target: $target,
                top:  top,
                left: left,
                maxTop: maxTop,
                maxLeft: maxLeft,
                cHeight: dashboardHeight,
                cWidth: dashboardWidth
            });
        },
        _onWidgetDragend: function(event){
            document.onmouseup = null;
            document.onmousemove = null;
            var $target = this.$target;
            //防止widget出dashboard边界
            var targetWidth = parseInt($target.width());
            var targetHeight = parseInt($target.height());
            var dashboardWidth = $target.parent().width();
            var dashboardHeight = $target.parent().height();

            var maxTop = dashboardHeight - targetHeight;
            var maxLeft = dashboardWidth - targetWidth;

            //drag interia
            var top = parseInt($target.css('top'));
            var left = parseInt($target.css('left'));
            var oLeft = left + this.perMoveX * 8;
            var oTop = top + this.perMoveY * 8;
            TweenMax.to($target, 1, {ease: Power3.easeOut, left:oLeft,top:oTop})
            .eventCallback('onUpdate', function(){
                boundsLimit({
                    target: $target,
                    //top:  top,
                    //left: left,
                    maxTop: maxTop,
                    maxLeft: maxLeft,
                    cHeight: dashboardHeight,
                    cWidth: dashboardWidth
                });
            });
        },
        _onDashboardDrag: function(event){
            var $wapperElement = this.$wapperElement,
                $dashboardElement = this.$dashboardElement,
                $targetElement = this.$targetElement,
                $target = $(event.target);
            this.$target = $(event.target);
            //animation stop
            TweenMax.killAll();
            //animation init 
            this.perMoveX = 0;  
            this.perMoveY = 0;
            this.lastX = 0;
            this.lastY = 0;

            scaleRate = actDivision(1,this.scale);

            if(isDashboardElement($target)){
                this.offset_x = event.clientX * scaleRate - event.target.offsetLeft;
                this.offset_y = event.clientY * scaleRate - event.target.offsetTop;
                document.onmousemove = this._onDashboardDraging.bind(this);
                document.onmouseup = this._onDashboardDragend.bind(this);
            }
        },
        _onDashboardDraging: function(event){
            var $target = this.$target,
                $wapperElement = this.$wapperElement,
                $dashboardElement = this.$dashboardElement,
                $targetElement = this.$targetElement;

            $target.css('cursor', "pointer");
            $target.css('position', "absolute");
            var scaleSize = this.scale;
            var scaleRate = actDivision(1,this.scale);

            //鼠标距离wigget的距离
            var mouseLeft = event.clientX - this.offset_x;
            var mouseTop = event.clientY - this.offset_y;
            //move间隔移动的距离
            this.perMoveX = (mouseLeft - this.lastX);  
            this.perMoveY = (mouseTop - this.lastY);
            this.lastX = mouseLeft;
            this.lastY = mouseTop;

            var targetTop = parseInt($target.css('top')) || 0;
            var targetLeft = parseInt($target.css('left')) || 0;

            var targetWidth = parseInt($target.width());
            var targetHeight = parseInt($target.height());

            var containerWidth = parseInt($targetElement.width());
            var containerHeight = parseInt($targetElement.height());

            var top = event.clientY * scaleRate - this.offset_y;
            var left = event.clientX * scaleRate - this.offset_x;

            //防止dashboard出container边界
            boundsLimit({
                target: $target,
                top:  top,
                left: left,
                cHeight: containerHeight * scaleRate,
                cWidth: containerWidth * scaleRate 
            });
        },
        _onDashboardDragend: function(event){
            document.onmouseup = document.onmousemove = null;
            var $target = this.$target;
            var $targetElement = this.$targetElement;
            var containerWidth = parseInt($targetElement.width());
            var containerHeight = parseInt($targetElement.height());
            var scaleSize = this.scale;
            var scaleRate = actDivision(1,this.scale);

            //drag interia
            var top = parseInt($target.css('top'));
            var left = parseInt($target.css('left'));
            var oLeft = left + this.perMoveX * 8;
            var oTop = top + this.perMoveY * 8;
            TweenMax.to($target, 1, {ease: Power3.easeOut, left:oLeft,top:oTop})
            .eventCallback('onUpdate', function(){
                boundsLimit({
                    target: $target,
                    //top:  top,
                    //left: left,
                    cHeight: containerHeight * scaleRate,
                    cWidth: containerWidth * scaleRate 
                });
            });
        },
        _offsetLeftAfterScaling: function(e,oldScale,newScale){
            var $wapperElement    = this.$wapperElement,
                $dashboardElement = this.$dashboardElement,
                $targetElement   = this.$targetElement;

            var width = parseInt($targetElement.width()),
                wapperX = this._getClientLeft($targetElement),
                oX = parseInt($dashboardElement.css('left')) || 0 ,
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
            var $wapperElement    = this.$wapperElement,
                $dashboardElement = this.$dashboardElement,
                $targetElement   = this.$targetElement;

            var height = parseInt($targetElement.height()),
                oY = parseInt($dashboardElement.css('top')) || 0,
                wapperY = this._getClientTop($targetElement),
                pageY = this._getPageY(e);
            //var By = ((pageY-wapperY) - oY * (oldScale/10.0)) / (height * (oldScale/10.0));
            //var newY = ((pageY-wapperY) - (By * height * (newScale/10.0))  ) * (10.0 / newScale);
             var By = ((pageY-wapperY) - oY * (oldScale)) / (height * (oldScale));
             var newY = ((pageY-wapperY) - (By * height * (newScale))  ) * (1 / newScale);
            //var By = actDivision(  actAdd(  actAdd(pageY,-wapperY), - actMultiply(oY , oldScale)) , actMultiply(height , oldScale));
            //var newY = actMultiply(  actAdd( actAdd(pageY,-wapperY), - actMultiply(actMultiply(By,height),newScale)  ) ,actDivision(1 , newScale));
            return newY;
        },
        _getClientTop: function($element){
            if($element.get) { $element = $element.get(0); }
            var offset = $element.offsetTop;
            if($element.offsetParent!=null) offset += arguments.callee($element.offsetParent);
            return offset;
            //return $element.offsetParent().offset().top;
        },
        _getClientLeft: function($element){
            if($element.get) { $element = $element.get(0); }
            var offset = $element.offsetLeft;
            if($element.offsetParent!=null) offset += arguments.callee($element.offsetParent);
            return offset;
            //return $element.offsetParent().offset().left;
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
    c.prototype.constructor 

    function isWapperElement ($elem){
        if($elem.hasClass('c-wapper')){
            return true;
        }
        return false;
    }
    function isDashboardElement ($elem){
        if($elem.hasClass('c-dashboard')){
            return true;
        }
        return false;
    }
    function isWidgetElement ($elem){
        if($elem.hasClass('c-widget')){
            return true;
        }
        return false;
    }

    //删除左右两端的空格
    String.prototype.trim = function(){
         return this.replace(/(^\s*)|(\s*$)/g, "");
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
        for(i=0 ;i<10;i++){
            var testWidget = document.createElement('div');
            testWidget.className = 'c-widget';
            dashboardElement.appendChild(testWidget);
        }


        return {
            'wapperElement': $(wapperElement),
            'dashboardElement': $(dashboardElement)
            };
    }

    function boundsLimit(option) {
        var $target = option.target,
            top     = option.top || parseInt($target.css('top')),
            left    = option.left || parseInt($target.css('left')),
            maxTop  = option.maxTop,
            maxLeft = option.maxLeft,
            cHeight = option.cHeight,
            cWidth  = option.cWidth;

        var targetWidth = parseInt($target.width());
        var targetHeight = parseInt($target.height());

        //目标元素高度小于容器高度
        if (targetHeight < cHeight) {
            if (top > 0) {
                (top + targetHeight) >= cHeight
                    ? $target.css('top', maxTop + "px") : $target.css('top', top + "px");
            } else {
                $target.css('top', "0px");
            }
        } else {
            if (top > 0) {
                $target.css('top', "0px");
            } else {
                if ((Math.abs(top) + cHeight) > targetHeight) {
                    $target.css('top', -(targetHeight - cHeight) + 'px');
                } else {
                    $target.css('top', top + "px");
                }
            }
        }
         //目标元素宽度小于容器宽度
        if (targetWidth < cWidth) {
            if (left > 0) {
                (left + targetWidth) >= cWidth
                    ? $target.css('left', maxLeft + "px") : $target.css('left', left + "px");
            } else {
                $target.css('left', "0px");
            }
        } else {
            if (left > 0) {
                $target.css('left', "0px");
            } else {
                if ((Math.abs(left) + cWidth) > targetWidth) {
                    $target.css('left', -(targetWidth - cWidth) + 'px');
                } else {
                    $target.css('left', left + "px");
                }
            }
        }
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
    window.collector = collector;

})(window, document);