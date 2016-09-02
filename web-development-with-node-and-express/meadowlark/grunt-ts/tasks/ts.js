'use strict';
const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const es6_promise_1 = require('es6-promise');
const utils = require('./modules/utils');
const compileModule = require('./modules/compile');
const referenceModule = require('./modules/reference');
const amdLoaderModule = require('./modules/amdLoader');
const html2tsModule = require('./modules/html2ts');
const templateCacheModule = require('./modules/templateCache');
const transformers = require('./modules/transformers');
const optionsResolver = require('../tasks/modules/optionsResolver');
const { asyncSeries, timeIt } = utils;
const fail_event = 'grunt-ts.failure';
function pluginFn(grunt) {
    grunt.registerMultiTask('ts', 'Compile TypeScript files', function () {
        let filesCompilationIndex = 0;
        let done, options;
        {
            const currentGruntTask = this;
            const resolvedFiles = currentGruntTask.files;
            done = currentGruntTask.async();
            let rawTaskConfig = (grunt.config.getRaw(currentGruntTask.name) || {});
            let rawTargetConfig = (grunt.config.getRaw(currentGruntTask.name + '.' + currentGruntTask.target) || {});
            optionsResolver.resolveAsync(rawTaskConfig, rawTargetConfig, currentGruntTask.target, resolvedFiles, grunt.template.process, grunt.file.expand).then((result) => {
                options = result;
                options.warnings.forEach((warning) => {
                    grunt.log.writeln(warning.magenta);
                });
                options.errors.forEach((error) => {
                    grunt.log.writeln(error.red);
                });
                if (options.errors.length > 0) {
                    if (options.emitGruntEvents) {
                        grunt.event.emit(fail_event);
                    }
                    done(false);
                    return;
                }
                proceed();
            }).catch((error) => {
                grunt.log.writeln((error + '').red);
                done(false);
            });
        }
        function proceed() {
            var srcFromVS_RelativePathsFromGruntFile = [];
            asyncSeries(options.CompilationTasks, (currentFiles) => {
                var reference = processIndividualTemplate(options.reference);
                var referenceFile;
                var referencePath;
                if (!!reference) {
                    referenceFile = path.resolve(reference);
                    referencePath = path.dirname(referenceFile);
                }
                function isReferenceFile(filename) {
                    return path.resolve(filename) === referenceFile;
                }
                var outFile = currentFiles.out;
                var outFile_d_ts;
                if (!!outFile) {
                    outFile = path.resolve(outFile);
                    outFile_d_ts = outFile.replace('.js', '.d.ts');
                }
                function isOutFile(filename) {
                    return path.resolve(filename) === outFile_d_ts;
                }
                function isBaseDirFile(filename, targetFiles) {
                    var baseDirFile = '.baseDir.ts';
                    var bd = '';
                    if (!options.baseDir) {
                        bd = utils.findCommonPath(targetFiles, '/');
                        options.baseDir = bd;
                    }
                    return path.resolve(filename) === path.resolve(path.join(bd, baseDirFile));
                }
                let amdloader = options.amdloader;
                let amdloaderFile, amdloaderPath;
                if (!!amdloader) {
                    amdloaderFile = path.resolve(amdloader);
                    amdloaderPath = path.dirname(amdloaderFile);
                }
                function runCompilation(options, compilationInfo) {
                    grunt.log.writeln('Compiling...'.yellow);
                    var starttime = new Date().getTime();
                    var endtime;
                    return compileModule.compileAllFiles(options, compilationInfo)
                        .then((result) => {
                        endtime = new Date().getTime();
                        grunt.log.writeln('');
                        if (!result) {
                            grunt.log.error('Error: No result from tsc.'.red);
                            return false;
                        }
                        if (result.code === 8) {
                            grunt.log.error('Error: Node was unable to run tsc.  Possibly it could not be found?'.red);
                            return false;
                        }
                        var isError = (result.code !== 0);
                        var level1ErrorCount = 0, level5ErrorCount = 0, nonEmitPreventingWarningCount = 0;
                        var hasTS7017Error = false;
                        var hasPreventEmitErrors = _.reduce(result.output.split('\n'), (memo, errorMsg) => {
                            var isPreventEmitError = false;
                            if (errorMsg.search(/error TS7017:/g) >= 0) {
                                hasTS7017Error = true;
                            }
                            if (errorMsg.search(/error TS1\d+:/g) >= 0) {
                                level1ErrorCount += 1;
                                isPreventEmitError = true;
                            }
                            else if (errorMsg.search(/error TS5\d+:/) >= 0) {
                                level5ErrorCount += 1;
                                isPreventEmitError = true;
                            }
                            else if (errorMsg.search(/error TS\d+:/) >= 0) {
                                nonEmitPreventingWarningCount += 1;
                            }
                            return memo || isPreventEmitError;
                        }, false) || false;
                        var isOnlyTypeErrors = !hasPreventEmitErrors;
                        if (hasTS7017Error) {
                            grunt.log.writeln(('Note:  You may wish to enable the suppressImplicitAnyIndexErrors' +
                                ' grunt-ts option to allow dynamic property access by index.  This will' +
                                ' suppress TypeScript error TS7017.').magenta);
                        }
                        if (level1ErrorCount + level5ErrorCount + nonEmitPreventingWarningCount > 0) {
                            if ((level1ErrorCount + level5ErrorCount > 0) || options.failOnTypeErrors) {
                                grunt.log.write(('>> ').red);
                            }
                            else {
                                grunt.log.write(('>> ').green);
                            }
                            if (level5ErrorCount > 0) {
                                grunt.log.write(level5ErrorCount.toString() + ' compiler flag error' +
                                    (level5ErrorCount === 1 ? '' : 's') + '  ');
                            }
                            if (level1ErrorCount > 0) {
                                grunt.log.write(level1ErrorCount.toString() + ' syntax error' +
                                    (level1ErrorCount === 1 ? '' : 's') + '  ');
                            }
                            if (nonEmitPreventingWarningCount > 0) {
                                grunt.log.write(nonEmitPreventingWarningCount.toString() +
                                    ' non-emit-preventing type warning' +
                                    (nonEmitPreventingWarningCount === 1 ? '' : 's') + '  ');
                            }
                            grunt.log.writeln('');
                            if (isOnlyTypeErrors && !options.failOnTypeErrors) {
                                grunt.log.write(('>> ').green);
                                grunt.log.writeln('Type errors only.');
                            }
                        }
                        var isSuccessfulBuild = (!isError ||
                            (isError && isOnlyTypeErrors && !options.failOnTypeErrors));
                        if (isSuccessfulBuild) {
                            let time = (endtime - starttime) / 1000;
                            grunt.log.writeln('');
                            let message = 'TypeScript compilation complete: ' + time.toFixed(2) + 's';
                            if (utils.shouldPassThrough(options)) {
                                message += ' for TypeScript pass-through.';
                            }
                            else {
                                message += ' for ' + result.fileCount + ' TypeScript files.';
                            }
                            grunt.log.writeln(message.green);
                        }
                        else {
                            grunt.log.error(('Error: tsc return code: ' + result.code).yellow);
                        }
                        return isSuccessfulBuild;
                    }).catch(function (err) {
                        grunt.log.writeln(('Error: ' + err).red);
                        if (options.emitGruntEvents) {
                            grunt.event.emit(fail_event);
                        }
                        return false;
                    });
                }
                function filterFilesTransformAndCompile() {
                    var filesToCompile = [];
                    if (currentFiles.src || options.vs) {
                        _.map(currentFiles.src, (file) => {
                            if (filesToCompile.indexOf(file) === -1) {
                                filesToCompile.push(file);
                            }
                        });
                        _.map(srcFromVS_RelativePathsFromGruntFile, (file) => {
                            if (filesToCompile.indexOf(file) === -1) {
                                filesToCompile.push(file);
                            }
                        });
                    }
                    else {
                        filesCompilationIndex += 1;
                    }
                    filesToCompile = filesToCompile.filter((file) => {
                        var stats = fs.lstatSync(file);
                        return !stats.isDirectory() && !isOutFile(file) && !isBaseDirFile(file, filesToCompile);
                    });
                    var generatedFiles = [];
                    if (options.html) {
                        let html2tsOptions = {
                            moduleFunction: _.template(options.htmlModuleTemplate),
                            varFunction: _.template(options.htmlVarTemplate),
                            htmlOutputTemplate: options.htmlOutputTemplate,
                            htmlOutDir: options.htmlOutDir,
                            flatten: options.htmlOutDirFlatten,
                            eol: (options.newLine || utils.eol)
                        };
                        let htmlFiles = grunt.file.expand(options.html);
                        generatedFiles = _.map(htmlFiles, (filename) => html2tsModule.compileHTML(filename, html2tsOptions));
                        generatedFiles.forEach((fileName) => {
                            if (filesToCompile.indexOf(fileName) === -1 &&
                                grunt.file.isMatch(currentFiles.glob, fileName)) {
                                filesToCompile.push(fileName);
                            }
                        });
                    }
                    if (options.templateCache) {
                        if (!options.templateCache.src || !options.templateCache.dest || !options.templateCache.baseUrl) {
                            grunt.log.writeln('templateCache : src, dest, baseUrl must be specified if templateCache option is used'.red);
                        }
                        else {
                            let templateCacheSrc = grunt.file.expand(options.templateCache.src);
                            let templateCacheDest = path.resolve(options.templateCache.dest);
                            let templateCacheBasePath = path.resolve(options.templateCache.baseUrl);
                            templateCacheModule.generateTemplateCache(templateCacheSrc, templateCacheDest, templateCacheBasePath, (options.newLine || utils.eol));
                        }
                    }
                    if (!!referencePath) {
                        var result = timeIt(() => {
                            return referenceModule.updateReferenceFile(filesToCompile.filter(f => !isReferenceFile(f)), generatedFiles, referenceFile, referencePath, (options.newLine || utils.eol));
                        });
                        if (result.it === true) {
                            grunt.log.writeln(('Updated reference file (' + result.time + 'ms).').green);
                        }
                    }
                    if (!!amdloaderPath) {
                        var referenceOrder = amdLoaderModule.getReferencesInOrder(referenceFile, referencePath, generatedFiles);
                        amdLoaderModule.updateAmdLoader(referenceFile, referenceOrder, amdloaderFile, amdloaderPath, currentFiles.outDir);
                    }
                    transformers.transformFiles(filesToCompile, filesToCompile, options);
                    currentFiles.src = filesToCompile;
                    if (utils.shouldCompile(options)) {
                        if (filesToCompile.length > 0 || options.testExecute || utils.shouldPassThrough(options)) {
                            return runCompilation(options, currentFiles).then((success) => {
                                return success;
                            });
                        }
                        else {
                            grunt.log.writeln('No files to compile'.red);
                            return es6_promise_1.Promise.resolve(true);
                        }
                    }
                    else {
                        return es6_promise_1.Promise.resolve(true);
                    }
                }
                var lastCompile = 0;
                if (!!options.watch) {
                    var watchpath = grunt.file.expand([options.watch]);
                    var chokidar = require('chokidar');
                    var watcher = chokidar.watch(watchpath, { ignoreInitial: true, persistent: true });
                    grunt.log.writeln(('Watching all TypeScript / Html files under : ' + watchpath).cyan);
                    watcher
                        .on('add', function (path) {
                        handleFileEvent(path, '+++ added   ', true);
                        lastCompile = new Date().getTime();
                    })
                        .on('change', function (path) {
                        handleFileEvent(path, '### changed ', true);
                        lastCompile = new Date().getTime();
                    })
                        .on('unlink', function (path) {
                        handleFileEvent(path, '--- removed ');
                        lastCompile = new Date().getTime();
                    })
                        .on('error', function (error) {
                        console.error('Error happened in chokidar: ', error);
                    });
                }
                lastCompile = new Date().getTime();
                return filterFilesTransformAndCompile();
                function handleFileEvent(filepath, displaystr, addedOrChanged = false) {
                    if (!utils.endsWith(filepath.toLowerCase(), '.ts') && !utils.endsWith(filepath.toLowerCase(), '.html')) {
                        return;
                    }
                    if ((new Date().getTime() - lastCompile) <= 100) {
                        return;
                    }
                    grunt.log.writeln((displaystr + ' >>' + filepath).yellow);
                    filterFilesTransformAndCompile();
                }
            }).then((res) => {
                if (!options.watch) {
                    if (res.some((success) => {
                        return !success;
                    })) {
                        if (options.emitGruntEvents) {
                            grunt.event.emit(fail_event);
                        }
                        done(false);
                    }
                    else {
                        done();
                    }
                }
            }, done);
        }
    });
    function processIndividualTemplate(template) {
        if (template) {
            return grunt.template.process(template, {});
        }
        return template;
    }
}
module.exports = pluginFn;
