 /**
 * collector.js v0.0.1
 *
 * Copyright (c) 2015-2015 Whilefor <whilefore@gmail.com>
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

        //选择器
        if ($(selector).length > 0) {           //".collection" || "#collection"
            this._selector = selector;
            this.$targetElement = $($(selector).get(0));
        }
        else{
        }
        this._options = options;


        //初始化
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


            //put the wapper element into the selected element
            this.$targetElement.append(collectorElements.wapperElement);
            this.$dashboardElement = $('.c-dashboard');

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
            var $menu = $("<div class='c-widget-menu'>" +
                            // '<button class="mdl-button mdl-js-button mdl-button--raised"> ' +
                            //     'button' +
                            // "</button>" + 
                        "</div>");
            $menu.css('transform', "scale(" + scaleRate + ")");
            this.$activeWidget.append($menu);
        },

        //wigdet drop----------------------------------------------------------------------------------
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

        //scale----------------------------------------------------------------------------------------
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

        //widget drag----------------------------------------------------------------------------------
        _onWidgetDrag: function(event){
            var $wapperElement = this.$wapperElement,
                $dashboardElement = this.$dashboardElement,
                $target = $(event.currentTarget);
            //传递给_onWidgetDraging和_onWidgetDragend
            this.$target = $target;

            this._animationStart();

            var scaleRate = actDivision(1,this.scale);
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

            //record mouse speed
            this._animationRecord(event);

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

            var maxTop  = dashboardHeight - targetHeight;
            var maxLeft = dashboardWidth - targetWidth;
            //出边界之后缓冲
            var isBorder = this._isBorder({
                target: $target,
                top:  top,
                left: left,
                cHeight: dashboardHeight,
                cWidth: dashboardWidth
            });
            if(isBorder){
                var moveRate = 0.2;

                top = top > 0 ? top : top * moveRate;
                top = top > maxTop ?  maxTop + (top - maxTop) * moveRate: top;

                left = left > 0 ? left : left * moveRate;
                left = left > maxLeft ?  maxLeft + (left - maxLeft) * moveRate: left;

                $target.css('top',  top  + "px");
                $target.css('left', left + "px");
            }
            else{
                $target.css('top',  top  + "px");
                $target.css('left', left + "px");               
            }
        },
        _onWidgetDragend: function(event){
            var date = new Date();
            if(date - this.lastDragTime > 50){
                this.perMoveX = 0;
                this.perMoveY = 0; 
            }
            document.onmouseup = document.onmousemove = null;
            this._animationUpdate();
        },

        //dashboard drag----------------------------------------------------------------------------------
        _onDashboardDrag: function(event){
            var $wapperElement = this.$wapperElement,
                $dashboardElement = this.$dashboardElement,
                $targetElement = this.$targetElement,
                $target = $(event.target);
            this.$target = $(event.target);

            this._animationStart();

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

            //record mouse speed
            this._animationRecord(event);

            var targetTop = parseInt($target.css('top')) || 0;
            var targetLeft = parseInt($target.css('left')) || 0;

            var targetWidth = parseInt($target.width());
            var targetHeight = parseInt($target.height());

            var containerWidth = parseInt($targetElement.width());
            var containerHeight = parseInt($targetElement.height());

            var top = event.clientY * scaleRate - this.offset_y;
            var left = event.clientX * scaleRate - this.offset_x;

            var cHeight = containerHeight * scaleRate;
            var cWidth = containerWidth * scaleRate;

            //防止dashboard出container边界
            var isBorder = this._isBorder({
                target: $target,
                top:  top,
                left: left,
                cHeight: containerHeight * scaleRate,
                cWidth: containerWidth * scaleRate 
            });
            //出边界之后缓冲
            if(isBorder){
                var moveRate = 0.05;  //出边界之后缓冲度

                var topGap = targetHeight - cHeight;
                top = top < 0 ? top : top * moveRate;
                top = (Math.abs(top) + cHeight) > targetHeight ? -topGap - (Math.abs(top) - topGap) * moveRate: top;

                var leftGap = targetWidth - cWidth;
                left = left < 0 ? left : left * moveRate;
                left = (Math.abs(left) + cWidth) > targetWidth ? -leftGap - (Math.abs(left) - leftGap) * moveRate: left;

                $target.css('top',  top  + "px");
                $target.css('left', left + "px");
            }
            else{
                $target.css('top',  top  + "px");
                $target.css('left', left + "px");               
            }
            // $target.css('top',  top  + "px");
            // $target.css('left', left + "px");               
        },
        _onDashboardDragend: function(event){
            var date = new Date();
            if(date - this.lastDragTime > 50){
                this.perMoveX = 0;
                this.perMoveY = 0; 
            }
            document.onmouseup = document.onmousemove = null;
            this._animationUpdate({'isDashboard': true});
        },

        //animation
        _animationStart: function(){
            //stop all animation
            if(!this._isReachBorder){
                TweenMax.killAll();
            }
            //init animation
            this.perMoveX = 0;  
            this.perMoveY = 0;
            this.lastX = 0;
            this.lastY = 0;
        },
        _animationRecord: function(event){
            //鼠标距离wigget的top, left
            var mouseLeft = event.clientX - this.offset_x;
            var mouseTop = event.clientY - this.offset_y;

            this.perMoveX = (mouseLeft - this.lastX);  
            this.perMoveY = (mouseTop - this.lastY);

            this.lastX = mouseLeft;
            this.lastY = mouseTop;

            this.lastDragTime = new Date();
        },
        _animationUpdate: function(option){
            var isDashboard = option && option.isDashboard;
            var $target = this.$target;
            var self = this;

            //防止widget出dashboard边界
            var targetWidth  = parseInt($target.width());
            var targetHeight = parseInt($target.height());
            var scaleSize = this.scale;
            var scaleRate = actDivision(1,this.scale);

            var cWidth  = $target.parent().width();
            var cHeight = $target.parent().height();

            var maxTop  = cWidth - targetHeight;
            var maxLeft = cHeight - targetWidth;

            if(isDashboard){
                var $targetElement = this.$targetElement;
                var containerWidth = parseInt($targetElement.width());
                var containerHeight = parseInt($targetElement.height());

                cWidth  = containerWidth * scaleRate;
                cHeight = containerHeight * scaleRate;
                maxTop  = null;
                maxLeft = null;
            }


            //拖动后惯性移动
            var isInertiaAnimation = true;
            var inertiaThresholdSpeed  = 5;            //拖拽后惯性移动阀值速度，小于该速度则直接贴近边界
            var inertiaDecelerateSpeed = 20;           //拖拽后惯性移动减速度，数字越大移动越大
            var inertiaEasingType = Power2.easeOut;    //惯性移动动画曲线
            var nearByDistanceRate = 0.005;            //距离边界多少百分比之后直接贴近
            //防止异常的速度
            this.perMoveX = Math.abs(this.perMoveX) > 500 ? 0: this.perMoveX;
            this.perMoveY = Math.abs(this.perMoveY) > 500 ? 0: this.perMoveY;
            //console.log(this.perMoveX, this.perMoveY);

            var oLeft = parseInt($target.css('left')) + this.perMoveX * inertiaDecelerateSpeed * scaleRate;
            var oTop  = parseInt($target.css('top'))  + this.perMoveY * inertiaDecelerateSpeed * scaleRate;
            if(!isDashboard){
                //接近边界之后直接贴边效果
                var oDistance = this._toBorderDistance({   //惯性移动后离边界的距离
                        target:  $target, oTop:    oTop,    oLeft:   oLeft,
                        cHeight: cHeight, cWidth:  cWidth,
                        perMoveX: this.perMoveX, perMoveY: this.perMoveY
                });
               
                if(oDistance.top > 0 && oDistance.top < cHeight * nearByDistanceRate){
                    oTop = this.perMoveY < 0 ? 0 : cHeight;
                }
                if(oDistance.left > 0 && oDistance.left < cWidth * nearByDistanceRate){
                    oLeft = this.perMoveX < 0 ? 0 : cWidth;
                }


                //小于阀值速度则贴近边界
                if(oDistance.top <= 0 && Math.abs(this.perMoveY) <= inertiaThresholdSpeed){
                    oTop = this.perMoveY <= 0 ? 0 : cHeight;
                }
                if(oDistance.left <= 0 && Math.abs(this.perMoveX) <= inertiaThresholdSpeed){
                    oLeft = this.perMoveX <= 0 ? 0 : cWidth;
                }

                //console.log(oTop,this.perMoveY, oLeft,this.perMoveX);
            }
            this._ineria = TweenMax.to($target, 1, {ease: inertiaEasingType, left: oLeft, top: oTop});
            if(!isInertiaAnimation){
                return;
            }

            //移动出边界之后惯性动画复位
            var decelerateTime = isDashboard ? 0.1 : 0.2;  //出边界之后惯性移动减速到静止的时间
            var accelerateTime = isDashboard ? 0.1 : 0.2;  //出边界之后惯性移动加速到静止的时间
            var resetEasingType = Power2.easeOut;          //复位移动动画曲线
            var resetSpeed = isDashboard ? 0.01 : 2;       //出边界之后惯性移动距离
            var isBorder; self._isReachBorder = false;
            this._ineria.eventCallback('onUpdate', function(){
                if(isBorder){
                    self._isReachBorder = true;
                    var cTop = parseInt($target.css('top')) ;
                    var cLeft = parseInt($target.css('left'));
                    // var cTop = parseInt($target.css('top')) > 0 ? parseInt($target.css('top')) : 0;
                    // var cLeft = parseInt($target.css('left')) > 0 ? parseInt($target.css('left')) : 0;
                    var oLeft = cLeft + self.perMoveX * resetSpeed * scaleRate;
                    var oTop  = cTop  + self.perMoveY * resetSpeed * scaleRate;
                    self._ineria.kill();

                    //惯性减速
                    var oldTop  = parseInt($target.css('top'));
                    var oldLeft = parseInt($target.css('left'));
                    TweenMax.to($target, decelerateTime, {ease: resetEasingType, left:oLeft,top:oTop})
                    .eventCallback('onComplete', function(){
                        var top  = parseInt($target.css('top'));
                        var left = parseInt($target.css('left'));
                        if(isDashboard){
                            left = left > 0 ? 0: left;
                            left = (Math.abs(left) + cWidth) > targetWidth ? -(targetWidth - cWidth) : left;

                            top = top > 0 ? 0: top;
                            top = (Math.abs(top) + cHeight) > targetHeight ? -(targetHeight - cHeight) : top;
                        }
                        else{
                            top = top > maxTop ? maxTop : top;
                            top = top < 0 ? 0 : top;
                            left = left > maxLeft ? maxLeft : left;
                            left = left < 0 ? 0 : left;
                            // top = top > maxTop ? maxTop : top + (top - oldTop + targetHeight);
                            // top = top < 0 ? 0 : top + (top - oldTop + targetHeight);
                            // left = left > maxLeft ? maxLeft : left + (left - oldLeft + targetWidth);
                            // left = left < 0 ? 0 : left  + (left - oldLeft + targetWidth);
                        }
                        //惯性加速复位
                        TweenMax.to($target, accelerateTime, {ease: resetEasingType, left:left,top:top})
                    });
                    

                    //TweenMax.to($target, decelerateTime, {ease: resetEasingType, left:oLeft,top:oTop, repeat:1, yoyo:true});


                    return;
                }
                isBorder = self._isBorder({
                    target: $target,
                    cHeight: cHeight,
                    cWidth: cWidth
                });
            });
        },
        _isBorder: function(option){
            var $target = option.target,
                top     = option.top || parseInt($target.css('top')),
                left    = option.left || parseInt($target.css('left')),
                cHeight = option.cHeight,
                cWidth  = option.cWidth;

            var targetWidth = parseInt($target.width());
            var targetHeight = parseInt($target.height());

            //目标元素高度小于容器高度
            if (targetHeight < cHeight) {
                if (top >= 0) {
                    if((top + targetHeight) > cHeight){
                        return true;
                    }
                    else{
                        $target.css('top', top + "px");
                    }
                } else {
                    return true;
                }
            } else {
                if (top > 0) {
                     return true;
                } else {
                    if ((Math.abs(top) + cHeight) > targetHeight) {
                        return true;
                    } else {
                        $target.css('top', top + "px");
                    }
                }
            }
             //目标元素宽度小于容器宽度
            if (targetWidth < cWidth) {
                if (left >= 0) {
                    if((left + targetWidth) > cWidth){
                        return true;
                    }
                    else{
                        $target.css('left', left + "px");
                    }
                } else {
                    return true;
                }
            } else {
                if (left > 0) {
                     return true;
                } else {
                    if ((Math.abs(left) + cWidth) > targetWidth) {
                        return true;
                    } else {
                        $target.css('left', left + "px");
                    }
                }
            }
        },
        _toBorderDistance: function(option){
            var oTop = option.oTop,
                oLeft = option.oLeft,
                cHeight = option.cHeight,
                cWidth  = option.cWidth,
                $target = option.target,
                perMoveX = option.perMoveX,
                perMoveY = option.perMoveY;

            var targetWidth = parseInt($target.width());
            var targetHeight = parseInt($target.height());

            var oDistance = {};

            //目标元素高度小于容器高度
            if (targetHeight <= cHeight) {
                if (oTop >= 0) {
                    if((oTop + targetHeight) >= cHeight){
                        oDistance.top = -(oTop - cHeight - targetHeight); 
                    }
                    else{
                        //移动的方向判断
                        perMoveY >= 0
                            ? oDistance.top = cHeight - oTop - targetHeight //下
                            : oDistance.top = oTop; //上
                    }
                } else {
                    oDistance.top = oTop;
                }
            } else {
                
            }
             //目标元素宽度小于容器宽度
            if (targetWidth <= cWidth) {
                if (oLeft >= 0) {
                    if((oLeft + targetWidth) >= cWidth){
                        oDistance.left = -(oLeft - cWidth - targetWidth); 
                    }
                    else{
                        //移动的方向判断
                        perMoveX >= 0
                            ? oDistance.left = cWidth - oLeft - targetWidth //右
                            : oDistance.left = oLeft; //左
                    }
                } else {
                    oDistance.left = oLeft;
                }
            } else {
                
            }

            return oDistance;
        },


        //element config----------------------------------------------------------------------------------
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
//---------------c----------------------------------------------------------------------------------
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

    function blank(){}
    function createCollectorTemplate(width,height,scale){
        var width = width || "10000px";
        var height = height || "10000px";

        //widget for test
        var widgets = '';
        for(i=0 ;i<10;i++){
            widgets += '<div class="c-widget c-widget-test"></div>';
        }

        //wapper
        var $wapperElement = $(
            '<div class="c-wapper" id="c-wapper" style="width:' + width + ';height:' + height + ';transform: scale(' + scale + ');">'+
                '<div class="c-dashboard" id="c-dashboard"> '+
                    widgets +
                '</div>' +
            '</div>'
        );
        return {
            'wapperElement': $wapperElement
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
    window.collector = collector;

})(window, document);