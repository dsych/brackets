define(function() {
"use strict";
    var ProjectLimiter = {};

    var maxProjectState = {
            fileSize: 0, // max size of any file in bytes. NOT USED now.
            fileCount: 0, // total number of files you can have in a project
            projectSize: 0// total number of bytes for all files in this project
    };
    var currentProjectState = {
        numOfFiles: 0 ,
        projectSize: 0
    };

    ProjectLimiter.initMaxLimits =  function (projectState){
        maxProjectState = projectState;
        console.log(projectState);
    };
   function _checkLimits(){
        if(currentProjectState.numOfFiles >= maxProjectState.fileCount || currentProjectState.projectSize >= maxProjectState.projectSize){
            console.log("Maximum project size or file count is exceeded!\nCurrent number of files: "+currentProjectState.numOfFiles 
            + "\nCurrent project size: " + currentProjectState.projectSize + "\nMaximum project file count: "
            + maxProjectState.fileCount + "\nMaximum project size: " + maxProjectState.projectSize);
        }
    };

    ProjectLimiter.newFile = function(){
            currentProjectState.numOfFiles +=1;
    };

    //accepts path be checked, filer and the oldSize of a file.
    //path has to be pointing to an existing file or to a file that has been just deleted. If not triggers incorrect behaviour.
    ProjectLimiter.checkLimits = function (root,fs,oldSize){
        var shell = new fs.Shell();
        shell.ls(root, {recursive:true},function(err,entries){
            if(err && err.code !== "ENOTDIR" && err.code !== "ENOENT"){ console.log(err);}
            //since file at the root has already been deleted, we need to catch it.
            else if(err.code === "ENOENT"){
                currentProjectState.numOfFiles -= 1;
                currentProjectState.projectSize -= oldSize;
                _checkLimits();
            }
            //working with an existing file
            else{
                var rc = {          
                    files: 0,
                    size: 0
                };
                //if(err && err.code === "ENOTDIR"){
                    fs.stat(root,function(err,stats){
                        if(err){console.log(err);}
                        
                        //deleted from file
                        if(stats.size < oldSize){
                            stats.size = stats.size - oldSize;
                        }
                        //added to a file. get delta
                        else{
                            stats.size = Math.abs(stats.size - oldSize);
                        }
                        currentProjectState.projectSize += stats.size;
                        _checkLimits();
                    });
                //}
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