# collector

`collector.js` is a JavaScript library
You can drag everything into it, also do every things you want, I'm still working on it.

## Downloads

To install it, if you're using Bower you can just run:
```javascript
	bower install collector --save
```

## Usage

Create a new collector:

```javascript
    var test = new collector(".collector", {
      width:"10000px",
      height:"10000px",
      maxScale:1,    //normal size
      minScale:0.1,  //minimun size
      scaling:0.05   //scale to increase or decrease
    });
```

.collector css style:


```css
    .collector
    {
    	width: 800px; height: 800px; overflow: hidden; 
    }
```


## Contributing

Whilefor

## License

MIT
