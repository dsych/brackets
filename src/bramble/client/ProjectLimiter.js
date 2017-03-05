define(function() {
    "use strict";
    var ProjectLimiter = {};

    var _maxProjectState = {
            fileSize: 0, // max size of any file in bytes. NOT USED now.
            fileCount: 0, // total number of files you can have in a project
            projectSize: 0// total number of bytes for all files in this project
    };
    var _currentProjectState = {
        numOfFiles: 0 ,
        projectSize: 0
    };

    var _fs;

    ProjectLimiter.initMaxLimits =  function (projectState,fs){
        _fs = fs;
        _maxProjectState = projectState;
        console.log(projectState);
    };
   function _checkLimits(){
        if(_currentProjectState.numOfFiles >= _maxProjectState.fileCount || _currentProjectState.projectSize >= _maxProjectState.projectSize){
            console.log("Maximum project size or file count is exceeded!\nCurrent number of files: "+_currentProjectState.numOfFiles 
            + "\nCurrent project size: " + _currentProjectState.projectSize + "\nMaximum project file count: "
            + _maxProjectState.fileCount + "\nMaximum project size: " + _maxProjectState.projectSize);
        }
    };

    ProjectLimiter.newFile = function(){
            _currentProjectState.numOfFiles +=1;
    };

    //accepts path be checked,the oldSize of a file, and an optional callback.
    //path has to be pointing to an existing file or to a file that has been just deleted. If not triggers incorrect behaviour.
    ProjectLimiter.checkLimits = function (pathname,oldSize,callback){
        var shell = new _fs.Shell();
        shell.ls(pathname, {recursive:true},function(err,entries){
            if(err && err.code !== "ENOTDIR" && err.code !== "ENOENT"){ console.log(err);}
            //since file at the pathname has already been deleted, we need to catch it.
            else if(err.code === "ENOENT"){
                _currentProjectState.numOfFiles -= 1;
                _currentProjectState.projectSize -= oldSize;
                _checkLimits();
            }
            //working with an existing file
            else{
                var rc = {          
                    files: 0,
                    size: 0
                };
                //if(err && err.code === "ENOTDIR"){
                    _fs.stat(pathname,function(err,stats){
                        if(err){console.log(err);}
                        
                        //deleted from file
                        if(stats.size < oldSize){
                            stats.size = stats.size - oldSize;
                        }
                        //added to a file. get delta
                        else{
                            stats.size = Math.abs(stats.size - oldSize);
                        }
                        _currentProjectState.projectSize += stats.size;
                        _checkLimits();
                    });
                //}
            }
            //call callback if provided 
            if(callback){
                callback(null,_currentProjectState);
            }
        });
    };

    // function countFiles(directories){
    //     var c = {
    //         files: 0,
    //         size: 0
    //     };
    //     if(!directories[0].size()){
    //         c.files++;
    //         c.size = directories.size;
    //     }
    //     else{
    //         var total = c;

    //        directories.contents.forEach(function(element) {
    //            c = countFiles(element);
    //            total.files++;
    //            total.size+=c.size;
    //        }, this);

    //        c = total;
    //     }

    //     return c;
    // }

    return ProjectLimiter;
});