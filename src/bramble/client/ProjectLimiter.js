define(function() {
"use strict";
    var ProjectLimiter = {};

    var maxProjectState = {};

    ProjectLimiter.initLimits =  function (projectState){
        maxProjectState = projectState;
        console.log(projectState);
    };

    return ProjectLimiter;
});