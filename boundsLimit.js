function boundsLimit($target, top, maxTop, cHeight, cWidth){
    var targetWidth = parseInt($target.width());
    var targetHeight = parseInt($target.height());

    if(targetHeight < cHeight){
      if(top > 0){
        (top + targetHeight) >= cHeight
          ? $target.css('top', maxTop + "px") : $target.css('top', top+ "px");
      }
      else{
        $target.css('top', "0px");
      }
    }
    else{
      if(top > 0){
        $target.css('top', "0px");
      }
      else{
        if(Math.abs(top))


          (top + targetHeight) >= cHeight
          ? $target.css('top', maxTop + "px") : $target.css('top', top+ "px");
      }
    }






    if(targetWidth < cWidth){
      if(left >0){
        (left + targetWidth) >= cWidth
          ? $target.css('left', maxLeft + "px") : $target.css('left', left+ "px");
      }
      else{
        $target.css('left', "0px");
      }
    }
    else{

    }




    if(top <= 0){
      (Math.abs(top) + containerHeight * scaleRate) >= targetHeight
        ? $target.css('top', maxTop + "px") : $target.css('top', top+ "px");
    }
    else{
        $target.css('top', "0px");
    }

    if(left <=0){
      (Math.abs(left) + containerWidth * scaleRate) >= targetWidth
        ? $target.css('left', maxLeft + "px") : $target.css('left', left+ "px");
    }
    else{
       $target.css('left', "0px");
    }
}