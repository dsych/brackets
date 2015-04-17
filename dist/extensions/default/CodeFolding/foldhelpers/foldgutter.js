define(function(require,exports,module){"use strict";var CodeMirror=brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),prefs=require("Prefs");function State(options){this.options=options;this.from=this.to=0}function parseOptions(opts){if(opts===true){opts={}}if(!opts.gutter){opts.gutter="CodeMirror-foldgutter"}if(!opts.indicatorOpen){opts.indicatorOpen="CodeMirror-foldgutter-open"}if(!opts.indicatorFolded){opts.indicatorFolded="CodeMirror-foldgutter-folded"}return opts}function marker(spec){var elt=document.createElement("div");elt.className=spec;return elt}function updateFoldInfo(cm,from,to){var minFoldSize=prefs.getSetting("minFoldSize")||2;var opts=cm.state.foldGutter.options;var fade=prefs.getSetting("hideUntilMouseover");var $gutter=$(cm.getGutterElement());var i=from;function isFold(m){return m.__isFold}function clear(m){return m.clear()}function _isCurrentlyFolded(line){var keys=Object.keys(cm._lineFolds),i=0,range;while(i<keys.length){range=cm._lineFolds[keys[i]];if(range.from.line<line&&range.to.line>=line){return range}i++}}if(i===to){window.setTimeout(function(){var vp=cm.getViewport();updateFoldInfo(cm,vp.from,vp.to)},200)}while(i<to){var sr=_isCurrentlyFolded(i),range;var mark=marker("CodeMirror-foldgutter-blank");var pos=CodeMirror.Pos(i),func=opts.rangeFinder||CodeMirror.fold.auto;if(sr){i=sr.to.line+1}else{range=cm._lineFolds[i]||func&&func(cm,pos);if(!fade||fade&&$gutter.is(":hover")){if(cm.isFolded(i)){if(range){mark=marker(opts.indicatorFolded)}else{cm.findMarksAt(pos).filter(isFold).forEach(clear)}}else{if(range&&range.to.line-range.from.line>=minFoldSize){mark=marker(opts.indicatorOpen)}}}cm.setGutterMarker(i,opts.gutter,mark);i++}}}function updateInViewport(cm,from,to){var vp=cm.getViewport(),state=cm.state.foldGutter;from=isNaN(from)?vp.from:from;to=isNaN(to)?vp.to:to;if(!state){return}cm.operation(function(){updateFoldInfo(cm,from,to)});state.from=from;state.to=to}function clearGutter(cm){var opts=cm.state.foldGutter.options;cm.clearGutter(opts.gutter);var blank=marker("CodeMirror-foldgutter-blank");var vp=cm.getViewport();cm.operation(function(){cm.eachLine(vp.from,vp.to,function(line){cm.setGutterMarker(line.lineNo(),opts.gutter,blank)})})}function syncDocToFoldsCache(cm,from,lineAdded){var minFoldSize=prefs.getSetting("minFoldSize")||2;var opts=cm.state.foldGutter.options||{};var rf=opts.rangeFinder||CodeMirror.fold.auto;var i,pos,folds,fold,range;if(lineAdded<=0){return}for(i=from;i<=from+lineAdded;i=i+1){pos=CodeMirror.Pos(i);folds=cm.doc.findMarksAt(pos);fold=folds.length?fold=folds[0]:undefined;if(fold&&fold.collapsed){range=rf(cm,CodeMirror.Pos(i));if(range&&range.to.line-range.from.line>=minFoldSize){cm._lineFolds[i]=range;i=i+range.to.line-range.from.line}else{delete cm._lineFolds[i]}}}}function updateFoldsCache(cm,from,linesDiff){var range;var minFoldSize=prefs.getSetting("minFoldSize")||2;var foldedLines=Object.keys(cm._lineFolds).map(function(d){return+d});if(linesDiff===0){if(foldedLines.indexOf(from)>=0){var opts=cm.state.foldGutter.options||{};var rf=opts.rangeFinder||CodeMirror.fold.auto;range=rf(cm,CodeMirror.Pos(from));if(range&&range.to.line-range.from.line>=minFoldSize){cm._lineFolds[from]=range}else{delete cm._lineFolds[from]}}}else if(foldedLines.length){var newFolds={};foldedLines.forEach(function(line){range=cm._lineFolds[line];if(line<from||linesDiff===0||range.from.line>=from&&range.to.line<=from+linesDiff&&linesDiff>0){newFolds[line]=range}else if(!(range.from.line+linesDiff<=from&&linesDiff<0)){range.from.line=range.from.line+linesDiff;range.to.line=range.to.line+linesDiff;newFolds[line+linesDiff]=range}});cm._lineFolds=newFolds}}function onChange(cm,changeObj){if(changeObj.origin==="setValue"){var folds=cm.getValidFolds(cm._lineFolds);cm._lineFolds=folds;Object.keys(folds).forEach(function(line){cm.foldCode(+line)})}else{var state=cm.state.foldGutter;var lineChanges=changeObj.text.length-changeObj.removed.length;if(changeObj.origin==="undo"&&lineChanges>0){syncDocToFoldsCache(cm,changeObj.from.line,lineChanges)}updateFoldsCache(cm,changeObj.from.line,lineChanges);if(lineChanges!==0){updateFoldInfo(cm,Math.max(0,changeObj.from.line+lineChanges),Math.max(0,changeObj.from.line+lineChanges)+1)}state.from=changeObj.from.line;state.to=0;window.clearTimeout(state.changeUpdate);state.changeUpdate=window.setTimeout(function(){updateInViewport(cm)},600)}}function onViewportChange(cm){var state=cm.state.foldGutter;window.clearTimeout(state.changeUpdate);state.changeUpdate=window.setTimeout(function(){var vp=cm.getViewport();if(state.from===state.to||vp.from-state.to>20||state.from-vp.to>20){updateInViewport(cm)}else{cm.operation(function(){if(vp.from<state.from){updateFoldInfo(cm,vp.from,state.from);state.from=vp.from}if(vp.to>state.to){updateFoldInfo(cm,state.to,vp.to);state.to=vp.to}else{updateFoldInfo(cm,vp.from,vp.to);state.to=vp.to;state.from=vp.from}})}},400)}function onFold(cm,from,to){var state=cm.state.foldGutter,line=from.line;if(line>=state.from&&line<state.to){updateFoldInfo(cm,line,line+1)}}function onUnFold(cm,from,to){var state=cm.state.foldGutter,line=from.line;var vp=cm.getViewport();if(line>=state.from&&line<state.to){updateFoldInfo(cm,line,Math.min(vp.to,to.line))}}function init(){CodeMirror.defineOption("foldGutter",false,function(cm,val,old){if(old&&old!==CodeMirror.Init){cm.clearGutter(cm.state.foldGutter.options.gutter);cm.state.foldGutter=null;cm.off("gutterClick",old.onGutterClick);cm.off("change",onChange);cm.off("viewportChange",onViewportChange);cm.off("fold",onFold);cm.off("unfold",onUnFold);cm.off("swapDoc",updateInViewport)}if(val){cm.state.foldGutter=new State(parseOptions(val));updateInViewport(cm);cm.on("gutterClick",val.onGutterClick);cm.on("change",onChange);cm.on("viewportChange",onViewportChange);cm.on("fold",onFold);cm.on("unfold",onUnFold);cm.on("swapDoc",updateInViewport)}})}exports.init=init;exports.clearGutter=clearGutter;exports.updateInViewport=updateInViewport});