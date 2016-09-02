"use strict";
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const utils = require('./utils');
function generateTemplateCache(src, dest, basePath, eol) {
    if (!src.length) {
        return;
    }
    var relativePaths = _.map(src, (anHtmlFile) => 'text!' + utils.makeRelativePath(basePath, anHtmlFile));
    var fileNames = _.map(src, (anHtmlFile) => path.basename(anHtmlFile));
    var fileVarialbeName = (anHtmlFile) => anHtmlFile.split('.').join('_').split('-').join('_');
    var fileVariableNames = _.map(fileNames, fileVarialbeName);
    var templateCacheTemplate = _.template('// You must have requirejs + text plugin loaded for this to work.'
        + eol + 'define([<%=relativePathSection%>],function(<%=fileNameVariableSection%>){'
        + eol + 'angular.module("ng").run(["$templateCache",function($templateCache) {'
        + eol + '<%=templateCachePut%>'
        + eol + '}]);'
        + eol + '});');
    var relativePathSection = '"' + relativePaths.join('",' + eol + '"') + '"';
    var fileNameVariableSection = fileVariableNames.join(',' + eol);
    var templateCachePutTemplate = _.template('$templateCache.put("<%= fileName %>", <%=fileVariableName%>);');
    var templateCachePut = _.map(fileNames, (fileName) => templateCachePutTemplate({
        fileName: fileName,
        fileVariableName: fileVarialbeName(fileName)
    })).join(eol);
    var fileContent = templateCacheTemplate({
        relativePathSection: relativePathSection,
        fileNameVariableSection: fileNameVariableSection,
        templateCachePut: templateCachePut
    });
    if (fs.existsSync(dest)) {
        var originalContents = fs.readFileSync(dest).toString();
        if (originalContents === fileContent) {
            return;
        }
    }
    fs.writeFileSync(dest, fileContent);
}
exports.generateTemplateCache = generateTemplateCache;
