'use strict';
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const utils = require('./utils');
const cache = require('./cacheUtils');
const semver = require('semver');
const es6_promise_1 = require('es6-promise');
exports.grunt = require('grunt');
var executeNode;
var executeNodeDefault = function (args, optionalInfo) {
    return new es6_promise_1.Promise((resolve, reject) => {
        exports.grunt.util.spawn({
            cmd: process.execPath,
            args: args
        }, (error, result, code) => {
            var ret = {
                code: code,
                output: result.stdout || result.stderr
            };
            resolve(ret);
        });
    });
};
var cacheClearedOnce = {};
function getChangedFiles(files, targetName) {
    files = cache.getNewFilesForTarget(files, targetName);
    _.forEach(files, (file) => {
        exports.grunt.log.writeln(('### Fast Compile >>' + file).cyan);
    });
    return files;
}
function resetChangedFiles(files, targetName) {
    cache.compileSuccessfull(files, targetName);
}
function clearCache(targetName) {
    cache.clearCache(targetName);
    cacheClearedOnce[targetName] = true;
}
function resolveTypeScriptBinPath() {
    var ownRoot = path.resolve(path.dirname((module).filename), '../..');
    var userRoot = path.resolve(ownRoot, '..', '..');
    var binSub = path.join('node_modules', 'typescript', 'bin');
    if (fs.existsSync(path.join(userRoot, binSub))) {
        return path.join(userRoot, binSub);
    }
    return path.join(ownRoot, binSub);
}
function getTsc(binPath) {
    return path.join(binPath, 'tsc');
}
function compileResultMeansFastCacheShouldBeRefreshed(options, result) {
    return (options.fast !== 'never' &&
        (result.code === 0 || (result.code === 2 && !options.failOnTypeErrors)));
}
exports.compileResultMeansFastCacheShouldBeRefreshed = compileResultMeansFastCacheShouldBeRefreshed;
function compileAllFiles(options, compilationInfo) {
    let targetFiles = compilationInfo.src;
    let files = _.map(targetFiles, (file) => file);
    var newFiles = files;
    if (options.fast === 'watch') {
        if (cacheClearedOnce[exports.grunt.task.current.target] === undefined) {
            clearCache(options.targetName);
        }
    }
    if (options.fast !== 'never') {
        if (compilationInfo.out) {
            exports.grunt.log.writeln('Fast compile will not work when --out is specified. Ignoring fast compilation'.cyan);
        }
        else {
            newFiles = getChangedFiles(files, options.targetName);
            if (newFiles.length !== 0 || options.testExecute || utils.shouldPassThrough(options)) {
                files = newFiles;
                if (compilationInfo.outDir && !options.baseDir) {
                    options.baseDir = utils.findCommonPath(files, '/');
                }
            }
            else {
                exports.grunt.log.writeln('No file changes were detected. Skipping Compile'.green);
                return new es6_promise_1.Promise((resolve) => {
                    var ret = {
                        code: 0,
                        fileCount: 0,
                        output: 'No files compiled as no change detected'
                    };
                    resolve(ret);
                });
            }
        }
    }
    var baseDirFile = '.baseDir.ts';
    var baseDirFilePath;
    if (compilationInfo.outDir && options.baseDir && files.length > 0) {
        baseDirFilePath = path.join(options.baseDir, baseDirFile);
        if (!fs.existsSync(baseDirFilePath)) {
            exports.grunt.file.write(baseDirFilePath, '// Ignore this file. See https://github.com/grunt-ts/grunt-ts/issues/77');
        }
        files.push(baseDirFilePath);
    }
    if (options.reference && compilationInfo.out) {
        var referenceFile = path.resolve(options.reference);
        files = [referenceFile];
    }
    files = _.map(files, (item) => `"${path.resolve(item)}"`);
    let args = files.slice(0), tsc, tscVersion = '';
    const tsconfig = options.tsconfig;
    if (options.compiler) {
        exports.grunt.log.writeln('Using the custom compiler : ' + options.compiler);
        tsc = options.compiler;
        tscVersion = '';
    }
    else {
        const tscPath = resolveTypeScriptBinPath();
        tsc = getTsc(tscPath);
        tscVersion = getTscVersion(tscPath);
        exports.grunt.log.writeln('Using tsc v' + tscVersion);
    }
    if (tsconfig && tsconfig.passThrough) {
        args.push('--project', tsconfig.tsconfig);
    }
    else {
        if (options.sourceMap) {
            args.push('--sourcemap');
        }
        if (options.emitDecoratorMetadata) {
            args.push('--emitDecoratorMetadata');
        }
        if (options.declaration) {
            args.push('--declaration');
        }
        if (options.removeComments) {
            args.push('--removeComments');
        }
        if (options.noImplicitAny) {
            args.push('--noImplicitAny');
        }
        if (options.noResolve) {
            args.push('--noResolve');
        }
        if (options.noEmitOnError) {
            args.push('--noEmitOnError');
        }
        if (options.preserveConstEnums) {
            args.push('--preserveConstEnums');
        }
        if (options.suppressImplicitAnyIndexErrors) {
            args.push('--suppressImplicitAnyIndexErrors');
        }
        if (options.noEmit) {
            args.push('--noEmit');
        }
        if (options.inlineSources) {
            args.push('--inlineSources');
        }
        if (options.inlineSourceMap) {
            args.push('--inlineSourceMap');
        }
        if (options.newLine && !utils.newLineIsRedundantForTsc(options.newLine)) {
            args.push('--newLine', options.newLine);
        }
        if (options.isolatedModules) {
            args.push('--isolatedModules');
        }
        if (options.noEmitHelpers) {
            args.push('--noEmitHelpers');
        }
        if (options.experimentalDecorators) {
            args.push('--experimentalDecorators');
        }
        if (options.experimentalAsyncFunctions) {
            args.push('--experimentalAsyncFunctions');
        }
        if (options.jsx) {
            args.push('--jsx', options.jsx.toLocaleLowerCase());
        }
        if (options.moduleResolution) {
            args.push('--moduleResolution', options.moduleResolution.toLocaleLowerCase());
        }
        if (options.rootDir) {
            args.push('--rootDir', options.rootDir);
        }
        if (options.noLib) {
            args.push('--noLib');
        }
        if (options.emitBOM) {
            args.push('--emitBOM');
        }
        if (options.locale) {
            args.push('--locale', options.locale);
        }
        if (options.suppressExcessPropertyErrors) {
            args.push('--suppressExcessPropertyErrors');
        }
        if (options.stripInternal) {
            args.push('--stripInternal');
        }
        if (options.allowSyntheticDefaultImports) {
            args.push('--allowSyntheticDefaultImports');
        }
        if (options.reactNamespace) {
            args.push('--reactNamespace', options.reactNamespace);
        }
        if (options.skipDefaultLibCheck) {
            args.push('--skipDefaultLibCheck');
        }
        if (options.pretty) {
            args.push('--pretty');
        }
        if (options.allowUnusedLabels) {
            args.push('--allowUnusedLabels');
        }
        if (options.noImplicitReturns) {
            args.push('--noImplicitReturns');
        }
        if (options.noFallthroughCasesInSwitch) {
            args.push('--noFallthroughCasesInSwitch');
        }
        if (options.allowUnreachableCode) {
            args.push('--allowUnreachableCode');
        }
        if (options.forceConsistentCasingInFileNames) {
            args.push('--forceConsistentCasingInFileNames');
        }
        if (options.allowJs) {
            args.push('--allowJs');
        }
        if (options.noImplicitUseStrict) {
            args.push('--noImplicitUseStrict');
        }
        args.push('--target', options.target.toUpperCase());
        if (options.module) {
            let moduleOptionString = ('' + options.module).toLowerCase();
            if ('none|amd|commonjs|system|umd|es6|es2015'.indexOf(moduleOptionString) > -1) {
                args.push('--module', moduleOptionString);
            }
            else {
                console.warn('WARNING: Option "module" only supports "none" | "amd" | "commonjs" | "system" | "umd" | "es6" | "es2015" '.magenta);
            }
        }
        if (compilationInfo.outDir) {
            if (compilationInfo.out) {
                console.warn('WARNING: Option "out" and "outDir" should not be used together'.magenta);
            }
            args.push('--outDir', compilationInfo.outDir);
        }
        if (compilationInfo.out) {
            args.push('--out', compilationInfo.out);
        }
        if (compilationInfo.dest && (!compilationInfo.out) && (!compilationInfo.outDir)) {
            if (utils.isJavaScriptFile(compilationInfo.dest)) {
                args.push('--out', compilationInfo.dest);
            }
            else {
                if (compilationInfo.dest === 'src') {
                    console.warn(('WARNING: Destination for target "' + options.targetName + '" is "src", which is the default.  If you have' +
                        ' forgotten to specify a "dest" parameter, please add it.  If this is correct, you may wish' +
                        ' to change the "dest" parameter to "src/" or just ignore this warning.').magenta);
                }
                if (Array.isArray(compilationInfo.dest)) {
                    if (compilationInfo.dest.length === 0) {
                    }
                    else if (compilationInfo.dest.length > 0) {
                        console.warn((('WARNING: "dest" for target "' + options.targetName + '" is an array.  This is not supported by the' +
                            ' TypeScript compiler or grunt-ts.' +
                            ((compilationInfo.dest.length > 1) ? '  Only the first "dest" will be used.  The' +
                                ' remaining items will be truncated.' : ''))).magenta);
                        args.push('--outDir', compilationInfo.dest[0]);
                    }
                }
                else {
                    args.push('--outDir', compilationInfo.dest);
                }
            }
        }
        if (args.indexOf('--out') > -1 && args.indexOf('--module') > -1) {
            if (semver.satisfies(tscVersion, '>=1.8.0')) {
                if ((options.module === 'system' || options.module === 'amd')) {
                }
                else {
                    console.warn(('WARNING: TypeScript 1.8+ requires "module" to be set to' +
                        'system or amd for concatenation of external modules to work.').magenta);
                }
            }
            else {
                console.warn(('WARNING: TypeScript < 1.8 does not allow external modules to be concatenated with' +
                    ' --out. Any exported code may be truncated.  See TypeScript issue #1544 for' +
                    ' more details.').magenta);
            }
        }
        if (options.sourceRoot) {
            args.push('--sourceRoot', options.sourceRoot);
        }
        if (options.mapRoot) {
            args.push('--mapRoot', options.mapRoot);
        }
    }
    if (options.additionalFlags) {
        args.push(options.additionalFlags);
    }
    function getTscVersion(tscPath) {
        const pkg = JSON.parse(fs.readFileSync(path.resolve(tscPath, '..', 'package.json')).toString());
        return '' + pkg.version;
    }
    if (options.verbose) {
        console.log(args.join(' ').yellow);
    }
    else {
        exports.grunt.log.verbose.writeln(args.join(' ').yellow);
    }
    let tempfilename = utils.getTempFile('tscommand');
    if (!tempfilename) {
        throw (new Error('cannot create temp file'));
    }
    fs.writeFileSync(tempfilename, args.join(' '));
    let command;
    if ('testExecute' in options) {
        if (_.isFunction(options.testExecute)) {
            command = [tsc, args.join(' ')];
            executeNode = options.testExecute;
        }
        else {
            const invalidTestExecuteError = 'Invalid testExecute node present on target "' +
                options.targetName + '".  Value of testExecute must be a function.';
            throw (new Error(invalidTestExecuteError));
        }
    }
    else {
        command = [tsc, '@' + tempfilename];
        executeNode = executeNodeDefault;
    }
    return executeNode(command, options).then((result) => {
        if (compileResultMeansFastCacheShouldBeRefreshed(options, result)) {
            resetChangedFiles(newFiles, options.targetName);
        }
        result.fileCount = files.length;
        fs.unlinkSync(tempfilename);
        exports.grunt.log.writeln(result.output);
        return es6_promise_1.Promise.cast(result);
    }, (err) => {
        fs.unlinkSync(tempfilename);
        throw err;
    });
}
exports.compileAllFiles = compileAllFiles;
