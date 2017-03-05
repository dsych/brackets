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

    ProjectLimiter.newFile = function(){
            _currentProjectState.numOfFiles +=1;
    };

    //accepts path be checked,the oldSize of a file, and an optional callback.
    //path has to be pointing to an existing file or to a file that has been just deleted. If not triggers incorrect behaviour.
    ProjectLimiter.checkLimits = function (pathname,oldSize,callback){
         _fs.stat(pathname,function(err,stats){
            if(err){ 
                //since file at the pathname has already been deleted, we need to catch it.
                if(err.code === "ENOENT"){
                    _currentProjectState.numOfFiles -= 1;
                    _currentProjectState.projectSize -= oldSize;
                    //_checkLimits();
                }
                else{
                    if(callback){
                        console.log(err);
                        return callback(err);
                    }
                }
            }
            //working with an existing file
            else{
                var rc = {          
                    files: 0,
                    size: 0
                };
                //deleted from file
                if(stats.size < oldSize){
                    stats.size = stats.size - oldSize;
                }
                //added to a file. get delta
                else{
                    stats.size = Math.abs(stats.size - oldSize);
                }
                _currentProjectState.projectSize += stats.size;
            }
            //call callback if provided 
            if(callback){
                callback(null,_currentProjectState);
            }
        });
    };
    return ProjectLimiter;
});