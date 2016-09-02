"use strict";
const fs = require('fs');
const path = require('path');
const grunt = require('grunt');
const _ = require('lodash');
const utils = require('./utils');
var currentTargetFiles;
var currentTargetDirs;
function getImports(currentFilePath, name, targetFiles, targetDirs, getIndexIfDir = true) {
    var files = [];
    var targetFile = _.find(targetFiles, (targetFile) => {
        return path.basename(targetFile) === name
            || path.basename(targetFile, '.d.ts') === name
            || path.basename(targetFile, '.ts') === name;
    });
    if (targetFile) {
        files.push(targetFile);
    }
    var targetDir = _.find(targetDirs, (targetDir) => {
        return path.basename(targetDir) === name;
    });
    if (targetDir) {
        var possibleIndexFilePath = path.join(targetDir, 'index.ts');
        if (getIndexIfDir
            && fs.existsSync(possibleIndexFilePath)
            && path.relative(currentFilePath, possibleIndexFilePath) !== '') {
            files.push(path.join(targetDir, 'index.ts'));
        }
        else {
            var filesInDir = utils.getFiles(targetDir, (filename) => {
                if (path.relative(currentFilePath, filename) === '') {
                    return true;
                }
                return path.extname(filename)
                    && (!_.endsWith(filename, '.ts') || _.endsWith(filename, '.d.ts'))
                    && !fs.lstatSync(filename).isDirectory();
            });
            filesInDir.sort();
            files = files.concat(filesInDir);
        }
    }
    return files;
}
function getTargetFolders(targetFiles) {
    var folders = {};
    _.forEach(targetFiles, (targetFile) => {
        var dir = path.dirname(targetFile);
        while (dir !== '.' && !(dir in folders)) {
            folders[dir] = true;
            dir = path.dirname(dir);
        }
    });
    return Object.keys(folders);
}
class BaseTransformer {
    constructor(key, variableSyntax) {
        this.key = key;
        this.match = new RegExp(utils.format(BaseTransformer.tsTransformerMatch, key));
        this.signature = this.tripleSlashTS() + key;
        this.signatureGenerated = this.signature + ':generated';
        this.syntaxError = '/// Invalid syntax for ts:' + this.key + '=' + variableSyntax + ' ' + this.signatureGenerated;
    }
    tripleSlashTS() {
        return '//' + '/ts:';
    }
    isGenerated(line) {
        return _.includes(line, this.signatureGenerated);
    }
    matches(line) {
        return line.match(this.match);
    }
    static containsTransformSignature(line) {
        return BaseTransformer.tsSignatureMatch.test(line);
    }
}
BaseTransformer.tsSignatureMatch = /\/\/\/\s*ts\:/;
BaseTransformer.tsTransformerMatch = '^///\\s*ts:{0}(=?)(.*)';
class BaseImportExportTransformer extends BaseTransformer {
    constructor(key, variableSyntax, template, getIndexIfDir, removeExtensionFromFilePath) {
        super(key, variableSyntax);
        this.key = key;
        this.template = template;
        this.getIndexIfDir = getIndexIfDir;
        this.removeExtensionFromFilePath = removeExtensionFromFilePath;
    }
    transform(sourceFile, templateVars) {
        var result = [];
        if (templateVars) {
            var vars = templateVars.split(',');
            var requestedFileName = vars[0].trim();
            var requestedVariableName = (vars.length > 1 ? vars[1].trim() : null);
            var sourceFileDirectory = path.dirname(sourceFile);
            var imports = getImports(sourceFile, requestedFileName, currentTargetFiles, currentTargetDirs, this.getIndexIfDir);
            if (imports.length) {
                _.forEach(imports, (completePathToFile) => {
                    var filename = requestedVariableName || path.basename(path.basename(completePathToFile, '.ts'), '.d');
                    if (filename.toLowerCase() === 'index') {
                        filename = path.basename(path.dirname(completePathToFile));
                    }
                    var pathToFile = utils.makeRelativePath(sourceFileDirectory, this.removeExtensionFromFilePath ? completePathToFile.replace(/(?:\.d)?\.ts$/, '') : completePathToFile, true);
                    result.push(this.template({ filename: filename, pathToFile: pathToFile, signatureGenerated: this.signatureGenerated })
                        + ' '
                        + this.signatureGenerated);
                });
            }
            else {
                result.push('/// No file or directory matched name "' + requestedFileName + '" ' + this.signatureGenerated);
            }
        }
        else {
            result.push(this.syntaxError);
        }
        return result;
    }
}
class ImportTransformer extends BaseImportExportTransformer {
    constructor() {
        super('import', '<fileOrDirectoryName>[,<variableName>]', _.template('import <%=filename%> = require(\'<%= pathToFile %>\');'), true, true);
    }
}
class ExportTransformer extends BaseImportExportTransformer {
    constructor(eol) {
        super('export', '<fileOrDirectoryName>[,<variableName>]', _.template('import <%=filename%>_file = require(\'<%= pathToFile %>\'); <%= signatureGenerated %>' + eol +
            'export var <%=filename%> = <%=filename%>_file;'), false, true);
        this.eol = eol;
    }
}
class ReferenceTransformer extends BaseImportExportTransformer {
    constructor() {
        super('ref', '<fileOrDirectoryName>', _.template('/// <reference path="<%= pathToFile %>"/>'), false, false);
    }
}
class UnknownTransformer extends BaseTransformer {
    constructor() {
        super('(.*)', '');
        this.key = 'unknown';
        this.signatureGenerated = this.tripleSlashTS() + 'unknown:generated';
        this.syntaxError = '/// Unknown transform ' + this.signatureGenerated;
    }
    transform(sourceFile, templateVars) {
        return [this.syntaxError];
    }
}
function transformFiles(changedFiles, targetFiles, options) {
    currentTargetDirs = getTargetFolders(targetFiles);
    currentTargetFiles = targetFiles;
    var transformers = [
        new ImportTransformer(),
        new ExportTransformer((options.newLine || utils.eol)),
        new ReferenceTransformer(),
        new UnknownTransformer()
    ];
    _.forEach(changedFiles, (fileToProcess) => {
        var contents = fs.readFileSync(fileToProcess).toString().replace(/^\uFEFF/, '');
        if (!BaseTransformer.containsTransformSignature(contents)) {
            return;
        }
        var lines = contents.split(/\r\n|\r|\n/);
        var outputLines = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (_.some(transformers, (transformer) => transformer.isGenerated(line))) {
                continue;
            }
            if (_.some(transformers, (transformer) => {
                var match = transformer.matches(line);
                if (match) {
                    outputLines.push(line);
                    outputLines.push.apply(outputLines, transformer.transform(fileToProcess, match[1] && match[2] && match[2].trim()));
                    return true;
                }
                return false;
            })) {
                continue;
            }
            outputLines.push(line);
        }
        var transformedContent = outputLines.join(utils.eol);
        if (transformedContent !== contents) {
            grunt.file.write(fileToProcess, transformedContent);
        }
    });
}
exports.transformFiles = transformFiles;
