# lazy-rules

### Usage

```bashp
lazy-rules 'images/*.png' css/style.css
```

**Output**

```css
.circle { background: url(../src/circle.png) no-repeat 0 0; width: 25px; height: 25px; }
.square { background: url(../src/square.png) no-repeat 0 0; width: 25px; height: 25px; }

@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
	.circle { background: url(../src/circle@2x.png) no-repeat 0 0; width: 25px; height: 25px; background-size: 25px 25px; }
	.square { background: url(../src/square@2x.png) no-repeat 0 0; width: 25px; height: 25px; background-size: 25px 25px; }
}
```
