/* eslint
"space-before-function-paren": ["error", "never"],
"space-before-blocks": ["error", "never"],
"comma-spacing": "error",
"space-in-parens": "error",
"brace-style": "error",
"no-trailing-spaces": ["error", { "skipBlankLines": false }],
"no-unreachable": "error",
"no-whitespace-before-property": "error",
"semi-spacing": "error",
"space-infix-ops": ["error", {"int32Hint": true}],
"no-unused-expressions": ["error", { "allowShortCircuit": true, "allowTernary": true }],
"keyword-spacing": "error",
"spaced-comment": "error",
"indent": ["error", 4],
"no-console": "warn",
"quotes": ["warn", "double"]
*/
define([
    // Change this to filer vs. filer.min if you need to debug Filer
    "thirdparty/filer/dist/filer.min",
], function(Filer){
    "use strict";

    var ProjectStats = {};
    var _Path = Filer.Path;
    var _root;

    // keep track of project state
    // host cache in the object should any other project states have to be added
    var _cache = {};

    var _fs = new Filer.FileSystem();
    var _shell = new _fs.Shell();
    ProjectStats.getFileSystem = function(){
        return _fs;
    };
    // NOTE: THIS WILL DESTROY DATA! For error cases only, or to wipe the disk.
    ProjectStats.formatFileSystem = function(flags, callback){
        _fs = new Filer.FileSystem(flags, callback);
        _shell = new _fs.Shell();
        return _fs;
    };

    // walk the whole file tree and record each path and file size
    ProjectStats.init = function(root, callback){
        function addSize(path, next){
            // ignore directories and do nothing
            if (path.endsWith("/")){
                return next();
            }

            _fs.stat(path, function(err, stats){
                if (err){
                    return next(err);
                }
                _cache[path] = stats.size;
                next();
            });
        }

        // original unlink
        var _innerUnlink = _fs.unlink;
        // overwrite unlink function to do the bookkeeping of project state and call original unlink.
        _fs.unlink = function(pathname, callback){
            _innerUnlink.call(_fs, pathname, function(err){
                // only update cache once original was successfull
                if (!err){
                    delete _cache[pathname];
                }
                callback(err);
            });
        };

        // original writeFile
        var _innerWriteFile = _fs.writeFile;
        // overwrite original writeFile and add bookkeeping of project state and call original writeFile.
        _fs.writeFile = function(filename, data, options, callback){
            if (typeof options === "function"){
                callback = options;
                options = {};
            }

            _innerWriteFile.call(_fs, filename, data, function(err){
                // only update cache once original was successfull
                if (!err){
                    _cache[filename] = data.length;
                }
                callback(err);
            });
        };

        // original rename
        var _innerRename = _fs.rename;
        // overwrite original rename and add bookkeeping of project state and call original rename.
        // this is essential because we don't want to lose track of file's size for renamed files.
        _fs.rename = function(oldPath, newPath, callback){
            _innerRename.call(_fs, oldPath, newPath, function(err){
                // only update cache once original was successfull
                if (!err){
                    _cache[newPath] = _cache[oldPath];
                    delete _cache[oldPath];
                }
                callback(err);
            });
        };

        // returns true/false depending on whether root/index.html exists
        ProjectStats.hasIndexFile = function(){
            if (!_root){
                return false;
            }

            var index = _Path.join(_root, "index.html");
            // Loop through all paths, return true if one of them is root/index.html
            return !!(Object.keys(_cache)).find(function(path){
                return path === index;
            });
        };

        // returns bytes of files in the root
        ProjectStats.getTotalProjectSize = function(){
            // Sum up all sizes in the cache and return
            if (!_root){
                return 0;
            }

            return (Object.values(_cache)).reduce(function(acc, val){
                return acc + (val ? val : 0);
            });
        };

        // returns project file count
        ProjectStats.getFileCount = function(){
            if (!_root){
                return 0;
            }
            return Object.keys(_cache).length;
        };

        // reinitialize project stats
        _root = root;
        _cache = {};

        // walk the root
        _shell.find(_root, { exec:addSize }, callback);
    };

    // accepts an array of mimes and/or file extensions
    // returns an array objects that contain filepath and size
    // note that duplicate extensions will produce duplicates in the result
    // passing mime and an extension that is part of that mime will produce duplicates
    ProjectStats.usesExtension = function(fileExtensions, callback){
        var rc = [];
        var seen = [];

        // record all of the extensions while converting mimes
        fileExtensions.forEach(function(ext, index){
            // check if mime is passed
            if (ext.includes("/")){
                Array.prototype.push.apply(seen, _extFromMime(ext));
            } else {
                Array.prototype.push.apply(seen, [ext]);
            }
        });

        fileExtensions = seen;

        // walk _cache looking for files matching extensions
        Object.keys(_cache).filter(function(path){
            fileExtensions.forEach(function(ext){
                if (path.match(new RegExp(ext + "$", "gi"))){
                    rc.push({
                        "path": path,
                        "size": _cache[path]
                    });
                }
            });
        });

        if (!rc.length){
            return callback("No files found!");
        }

        callback(null, rc);
    };

    // function converts mimes into corresponding file formats.
    // mime format e.g. "text/html". Also supports "text/*", which returs an array of all corresponding types.
    function _extFromMime(mime){
        mime = mime.toLowerCase();
        var rc = [];

        switch (mime){
        // first check for all text types
        case "text/*":
            return rc.concat(".html", ".htmls", ".htm", ".htx", ".md", ".markdown", ".css", ".js", ".txt");
        case "text/html":
            return rc.concat(".html", ".htmls", ".htm", ".htx", ".md", ".markdown");
        case "text/css":
            return rc.concat(".css");
        case "text/javascript":
            return rc.concat(".js");
        case "text/plain":
            return rc.concat(".txt");
        // first check for all image types
        case "image/*":
            return rc.concat(".gif", ".jpg", ".jpe", ".jpeg", ".ico", ".png", ".svg", ".bmp");
        case "image/x-icon":
            return rc.concat(".ico");
        case "image/bmp":
            return rc.concat(".bmp");
        case "image/svg+xml":
            return rc.concat(".svg");
        case "image/png":
            return rc.concat(".png");
        case "image/jpeg":
            return rc.concat(".jpg", ".jpe", ".jpeg");
        case "image/gif":
            return rc.concat(".gif");
        // Some of these media types can be video or audio, prefer video.
        // check all video types
        case "video/*":
            return rc.concat(".avi", ".divx", ".wbm", ".mov", ".qt", ".ogg", ".ogv", ".mpeg", ".mp4");
        case "video/mp4":
            return rc.concat(".mp4");
        case "video/mpeg":
            return rc.concat(".mpeg");
        case "video/ogg":
            return rc.concat(".ogg", ".ogv");
        case "video/quicktime":
            return rc.concat(".mov", ".qt");
        case "video/webm":
            return rc.concat(".webm");
        case "video/avi":
            return rc.concat(".avi", ".divx");
        // check for all audio types
        case "audio/*":
            return rc.concat(".mpa", ".mp3", ".wav");
        case "audio/mpeg":
            return rc.concat(".mpa", ".mp3");
        case "audio/vnd.wave":
            return rc.concat(".wav");
        // Web Fonts
        // check for all web Fonts
        case "application/font*":
            return rc.concat(".eot", ".otf", ".ttf", ".woff");
        case "application/vnd.ms-fontobject":
            return rc.concat(".eot");
        case "application/x-font-opentype":
            return rc.concat(".otf");
        case "application/x-font-ttf":
            return rc.concat(".ttf");
        case "application/font-woff":
            return rc.concat(".woff");
        }

        // 'application/octet-stream'
        return ".*";
    };

    return ProjectStats;
});
