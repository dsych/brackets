define([
    // Change this to filer vs. filer.min if you need to debug Filer
    "thirdparty/filer/dist/filer.min",
],function(Filer){
    "use strict";

    var ProjectStats = {};
    
    var _fs = new Filer.FileSystem();
    ProjectStats.getFileSystem = function(){
        if(_fs){
            return _fs;
        }
        return null;
    };

    var _shell = new _fs.Shell();
    var _Path = Filer.Path;
    var _root;

    // keep track of project state
    // host cache in the object should any other project states have to be added
    var _cache = {};

    //walk the whole file tree and count its size
    ProjectStats.init = function(root, callback){
        function addSize(path, next){
            // If the current path is a directory, record 0 for size
            if(path.endsWith("/")) {
                return next();
            }

            _fs.stat(path,function(err, stats){
                _cache[path] = stats.size;
            });
        
            
            next();
        }

        // reinitialize project stats
        _root = root;

        //walk the root
        _shell.find(_root, { exec:addSize }, function(err){
            if(err) {
               return callback(err);
            }
        });

        callback(null);
    };

    // original unlink
    var _innerUnlink = _fs.unlink;
    // overwrite unlink function to do the bookkeeping of project state and call original unlink.
    _fs.unlink = function(pathname, callback){

        // call original Filer.unlink
        _innerUnlink.call(_fs, pathname, function(err){
            // only update cache once original was successful
            if(!err){
                // stop keeping track of deleted file
                delete _cache[pathname];
            }
            
            // call callback regardless
            callback(err);
        });
    };

    // original writeFile
    var _innerWriteFile = _fs.writeFile;
    // overwrite original writeFile and add bookkeeping of project state and call original writeFile.
    _fs.writeFile = function(filename, data, options, callback){
        function update(){
            //only check once _root is established
            if(_root){
                // owerwrite or add a new size for a given filename
                _cache[filename] = data.length;
            }
        };

        if(arguments.length === 3){
            // callback is now assigned to optins
            _innerWriteFile.call(_fs, filename, data, function(err){
                // only update cache once original was successful
                if(!err){
                    update();
                }
                
                // call callback regardless
                options(err);
            });
        } else {
            _innerWriteFile.call(_fs, filename, data, options, function(err){
                // only update cache once original was successful
                if(!err){
                    update();
                }
                
                // call callback regardless
                callback(err);
            });
        }
    };

    // original rename
    var _innerRename = _fs.rename;
    // overwrite original rename and add bookkeeping of project state and call original rename.
    // this is essential because we don't want to lose track of file's size for renamed files.
    _fs.rename = function(oldPath, newPath, callback){
        _innerRename.call(_fs, oldPath, newPath, function(err){
            // only update cache once original was successful
            if(!err){
                _cache[newPath] = _cache[oldPath];
                delete _cache[oldPath];
            }
            
            // call callback regardless
            callback(err);
        });
    };

    // returns true/false depending on whether root/index.html exists
    ProjectStats.hasIndexFile = function() {
        // Loop through all paths, return true if one of them is root/index.html
        return !!(Object.keys(_cache)).find(function(path) {
            return path === _Path.join(_root, "index.html");
        });
    };

    // returns an array of filenames for specified extension
    // adds period if not provided
    ProjectStats.usesExtension = function(fileExtensions, callback) {
        var rc = [];

        if(_root){ 
            //walk the root
            Object.keys(_cache).filter(function(path){
                fileExtensions.forEach(function(ext, index){
                    // check if mime is passed          
                    if(ext.includes('/')){
                        // remove the mime and replace it with corresponding extensions
                        fileExtensions.pop(index, 1);
                        Array.prototype.push.apply(fileExtensions, _extFromMime(ext));
                    } else {
                        if(path.endsWith(ext)){
                            // check to if this extension has been encountered before
                            if(rc[ext]){
                                rc[ext].push(path);
                            } else {
                                rc[ext] = Array.from([path]);
                            }
                        }
                    }
                    
                });
            });
        }

        // manually update the length, since we are using string as keys
        rc.length = Object.keys(rc).length;
        if(!rc.length){
            return callback("No files found!");
        }

        callback(null,rc);
    };

    // returns bytes of files in the root   
    ProjectStats.getTotalProjectSize = function() {
        // Sum up all sizes in the cache and return
        return _root ? (Object.values(_cache)).reduce(function(acc, val) {
            return acc + (val ? val : 0);
        }) : 0;
    };

    // returns project file count
    ProjectStats.getFileCount = function (){
        return _root ? Object.keys(_cache).length : 0;
    };

    // function converts mimes into corresponding file formats.
    // mime format e.g. "text/html". Also supports "text/*", which returs an array of all corresponding types.
    function _extFromMime(mime) {
        mime = mime.toLowerCase();
        var rc = [];

        switch(mime) {
        // first check for all text types
        case 'text/*':
            return rc.concat('.html','.htmls','.htm','.htx','.md','.markdown','.css','.js','.txt');
        case 'text/html':
            return rc.concat('.html','.htmls','.htm','.htx','.md','.markdown');
        case 'text/css':
            return rc.concat('.css');
        case 'text/javascript':
            return rc.concat('.js');
        case 'text/plain':
            return rc.concat('.txt');
        // first check for all image types
        case 'image/*':
            return rc.concat('.gif','.jpg','.jpe','.jpeg','.ico','.png','.svg','.bmp');
        case 'image/x-icon':
            return rc.concat('.ico');
        case 'image/bmp':
            return rc.concat('.bmp');
        case 'image/svg+xml':
            return rc.concat('.svg');
        case 'image/png':
            return rc.concat('.png');
        case 'image/jpeg':
            return rc.concat('.jpg','.jpe','.jpeg');
        case 'image/gif':
            return rc.concat('.gif');
        // Some of these media types can be video or audio, prefer video.
        // check all video types
        case 'video/*':
            return rc.concat('.avi','.divx','.webm','.mov','.qt','.ogg','.ogv','.mpeg','.mp4'); 
        case 'video/mp4':
            return rc.concat('.mp4');
        case 'video/mpeg':
            return rc.concat('.mpeg');
        case 'video/ogg':
            return rc.concat('.ogg','.ogv');
        case 'video/quicktime':
            return rc.concat('.mov','.qt');
        case 'video/webm':
            return rc.concat('.webm');
        case 'video/avi':
            return rc.concat('.avi','.divx');
        // check for all audio types
        case 'audio/*':
            return rc.concat('.mpa','.mp3','.wav');
        case 'audio/mpeg':
            return rc.concat('.mpa','.mp3');
        case 'audio/vnd.wave':
            return rc.concat('.wav');
        // Web Fonts
        // check for all web Fonts
        case 'application/font*':
            return rc.concat('.eot','.otf','.ttf','.woff');
        case 'application/vnd.ms-fontobject':
            return rc.concat('.eot');
        case 'application/x-font-opentype':
            return rc.concat('.otf');
        case 'application/x-font-ttf':
            return rc.concat('.ttf');
        case 'application/font-woff':
            return rc.concat('.woff');
        }

        //'application/octet-stream'
        return '.*';
    };

    return ProjectStats;
});
