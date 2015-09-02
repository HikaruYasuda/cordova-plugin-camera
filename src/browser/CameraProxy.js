/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 */

function takePicture(success, error, opts) {
    var encoding = opts[5],
        destinationType = opts[1];
    if (opts && opts[2] === 1) {
        capture(success, error, encoding, destinationType);
    } else {
        var input = document.createElement('input');
        input.type = 'file';
        input.name = 'files[]';

        input.onchange = function(inputEvent) {
            var canvas = document.createElement('canvas');

            var reader = new FileReader();
            reader.onload = function(readerEvent) {
                input.parentNode.removeChild(input);

                var imageData = readerEvent.target.result;
                if (destinationType === Camera.DestinationType.FILE_URI) {
                    var encoding = input.value.split('.').pop() === 'png' ? Camera.EncodingType.PNG : Camera.EncodingType.JPEG;
                    getURI(imageData, encoding, function(url) {
                        success(url);
                    }, error);
                } else {
                    return success(imageData.substr(imageData.indexOf(',') + 1));
                }
            }

            reader.readAsDataURL(inputEvent.target.files[0]);
        };

        document.body.appendChild(input);
    }
}

function getExt(encoding) {
    switch (encoding) {
        case Camera.EncodingType.JPEG:
            return '.jpeg';
        case Camera.EncodingType.PNG:
        default:
            return '.png';
    }
}
function getURI(dataURL, encoding, cb, onError) {
    var ext = getExt(encoding);
    var blob = dataURI2Blob(dataURL);
    webkitRequestFileSystem(window.TEMPORARY, 0, function(fs) {
        var dir = 'camera/';
        var fName =  + (new Date()-0) + ext;
        fs.root.getDirectory(dir, {create:true}, function(dirEntry) {
            dirEntry.getFile(fName, {create:true, exclusive:true}, function(entry) {
                entry.createWriter(function(writer) {
                    writer.onwrite = function () {
                        cb(entry.toURL());
                    };
                    writer.onerror = onError;
                    writer.write(blob);
                }, onError);
            }, onError);
        }, onError);
    }, onError);

    function dataURI2Blob(dataURI) {
        var split = dataURI.split(','), mime = split[0], byteString = atob(split[1]);
        var mimeString = mime.split(':')[1].split(';')[0];
        var i = 0, ii = byteString.length, ia = new Uint8Array(ii);
        for (; i < ii; i++) ia[i] = byteString.charCodeAt(i);
        return new Blob([ia], {type:mimeString});
    }
}

function capture(success, errorCallback, encoding, destinationType) {
    var localMediaStream;

    var video = document.createElement('video');
    var button = document.createElement('button');

    video.width = 320;
    video.height = 240;
    button.innerHTML = 'Capture!';

    button.onclick = function() {
        // create a canvas and capture a frame from video stream
        var canvas = document.createElement('canvas');
        canvas.getContext('2d').drawImage(video, 0, 0, 320, 240);
        
        // convert image stored in canvas to base64 encoded image
        //var imageData = canvas.toDataURL('img/png');
        //imageData = imageData.replace('data:image/png;base64,', '');

        // stop video stream, remove video and button
        localMediaStream.stop();
        video.parentNode.removeChild(video);
        button.parentNode.removeChild(button);

        if (destinationType === Camera.DestinationType.FILE_URI) {
            function getMime(encoding) {
                switch (encoding) {
                    case Camera.EncodingType.JPEG:
                        return 'image/jpeg';
                    case Camera.EncodingType.PNG:
                    default:
                        return 'image/png';
                }
            }
            getURI(canvas.toDataURL(getMime(encoding)), encoding, function(url) {
                success(url);
            }, errorCallback);
        } else {
            return success(imageData);
        }
    }

    navigator.getUserMedia = navigator.getUserMedia ||
                             navigator.webkitGetUserMedia ||
                             navigator.mozGetUserMedia ||
                             navigator.msGetUserMedia;

    var successCallback = function(stream) {
        localMediaStream = stream;
        video.src = window.URL.createObjectURL(localMediaStream);
        video.play();

        document.body.appendChild(video);
        document.body.appendChild(button);
    }

    if (navigator.getUserMedia) {
        navigator.getUserMedia({video: true, audio: true}, successCallback, errorCallback);
    } else {
        alert('Browser does not support camera :(');
    }
}

module.exports = {
    takePicture: takePicture,
    cleanup: function(success, error){
        webkitRequestFileSystem(window.TEMPORARY, 0, function(fs) {
            var dir = 'camera/';
            fs.root.getDirectory(dir, {create:true}, function(dirEntry) {
                dirEntry.removeRecursively(success, error);
            }, error);
        }, error);
    }
};

require("cordova/exec/proxy").add("Camera",module.exports);
