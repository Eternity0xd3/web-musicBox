var song;
var button;
var fft;

var volume;
var isPlaying;

function preload(){
    song = loadSound("Designant.mp3");
}

function setup(){
    fft = new p5.FFT(0.8, 128);
    isPlaying = false;

    createCanvas(128*8, 400);
    button = createButton("play");
    button.mousePressed(togglePlaying);
}

function togglePlaying(){
    if(!isPlaying){
        song.play();
        song.setVolume(1);
        button.html("pause");
    } else {
        song.pause();
        button.html("play");
    }
    isPlaying = !isPlaying;
}

function draw(){
    background(0);
    var spectrum = fft.analyze();

    stroke(255)
    for (let i = 0; i < spectrum.length; i++) {
        var each = spectrum[i];
        // if(i >= 86){
        //     each = each * 1.3
        // }
        var y = map(each, 0, 255, height, 0);
        colorMode(HSB)
        fill(i,255,255)
        w = width/spectrum.length
        rect(i*w, y, w, height-y);
    }

    // ellipse(250,250,500,volume*500);
}