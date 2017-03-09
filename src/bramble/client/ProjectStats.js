define([
    // Change this to filer vs. filer.min if you need to debug Filer
    "thirdparty/filer/dist/filer"
],function(Filer){
    "use strict";

    function ProjectStats() {};
    
    var _fs = new Filer.FileSystem();
    var _shell = new _fs.Shell();
    var _Path = Filer.Path;
    var _root;

    ProjectStats.getFileSystem = function(){
        if(_fs){
            return _fs;
        }
    };

    // keep track of project state
    var _projectInfo = {
        size: 0,
        fileCount: 0
    };
    // existance of index.html
    var _hasIndex = false;

    //walk the whole file tree and count its size
    ProjectStats.init = function(root,callback){
        function addSize(path,next){
            // If the current path is a directory, do nothing
            if(path.endsWith("/")) {
                return next();
            }

            _fs.stat(path,function(err,stats){
                _projectInfo.size += stats.size;
                _projectInfo.fileCount++;
            });

            next();
        }

        // reinitialize project stats
        _root = root;
        _projectInfo = {
            size: 0,
            fileCount: 0
        };

        //walk the root
        _shell.find(_root, { exec:addSize }, function(err){
            if(err) {console.log(err); }
        });

        callback();
    };

    // original unlink
    var _innerUnlink = _fs.unlink;
    // overwrite unlink function to do the bookkeeping of project state and call original unlink.
    _fs.unlink = function(pathname, callback){
        
        // file being deleted in index html
        if(pathname === _Path.join(_root,"index.html")){
            _hasIndex = false;
        }

        _projectInfo.fileCount--;
        _fs.stat(pathname,function(err,stats){
            if(err){ callback(err); }
            
            _projectInfo.size -= stats.size;

            // call original Filer.unlink
            _innerUnlink.call(_fs,pathname,callback);
        });
    };

    // original writeFile
    var _innerWriteFile = _fs.writeFile;
    // overwrite original writeFile and add bookkeeping of project state and call original writeFile.
    _fs.writeFile = function(filename, data, options, callback){
        
        //only check once _root is established
        if(_root){
            //check for a new file
            _fs.stat(filename,function(err,stats){
                if(err && err.code === "ENOENT"){ 

                    // check if it index.html
                    if(filename === _Path.join(_root,"index.html")){
                        _hasIndex = true;
                    }

                    _projectInfo.fileCount++; 

                    // simulate size for a new file
                    stats = {
                        size: 0
                    };
                }

                // calculate a new size of a file
                var oldSize = stats.size;
                _projectInfo.size += data.length - oldSize;
            });
        }

        if(arguments.length === 3){
                // callback is now assigned to optins
               _innerWriteFile.call(_fs, filename, data,options);
           }
            else{
                _innerWriteFile.call(_fs, filename, data, options,callback);
        }
    };

    // returns true/false depending on whether root/index.html exists
    ProjectStats.hasIndexFile = function() {
        return _hasIndex;
    };

     // returns an array of filenames for specified extension
     // adds period if not provided
    ProjectStats.usesExtension = function(fileExtension,callback) {
        function findPeriod(element){
            return element === '.';
        };

        // add a period if not provided
        if(Array.from(fileExtension).findIndex(findPeriod) === -1){
            fileExtension = "." + fileExtension;
        }

        //walk the root
        _shell.find(_root, { name: "*" + fileExtension }, function(err,found){
            if(err) { callback(err); }

            callback(null,found);
        });
    };

    // returns bytes of files in the root   
    ProjectStats.getTotalSize = function(){
        return _projectInfo.size;
    }; 

    return ProjectStats;
});
