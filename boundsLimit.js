function boundsLimit(option) {
    var $target = option.target,
        top     = option.top,
        left    = option.left,
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
                $target.css('top', targetHeight + 'px');
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
                $target.css('left', targetWidth + 'px');
            } else {
                $target.css('left', top + "px");
            }
        }
    }
}
