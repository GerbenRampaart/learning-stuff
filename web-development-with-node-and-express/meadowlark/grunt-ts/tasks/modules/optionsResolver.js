'use strict';
const defaults_1 = require('./defaults');
const utils = require('./utils');
const _ = require('lodash');
const es6_promise_1 = require('es6-promise');
const visualStudioOptionsResolver_1 = require('./visualStudioOptionsResolver');
const tsconfig_1 = require('./tsconfig');
const propertiesFromTarget = ['amdloader', 'baseDir', 'html', 'htmlOutDir', 'htmlOutDirFlatten', 'reference', 'testExecute', 'tsconfig',
    'templateCache', 'vs', 'watch'], propertiesFromTargetOptions = ['additionalFlags', 'allowSyntheticDefaultImports', 'comments', 'compile', 'compiler', 'declaration',
    'emitBOM', 'emitDecoratorMetadata', 'experimentalDecorators', 'failOnTypeErrors', 'fast', 'htmlModuleTemplate', 'htmlOutDir',
    'htmlOutputTemplate', 'htmlOutDirFlatten', 'htmlVarTemplate', 'inlineSourceMap', 'inlineSources', 'isolatedModules', 'locale',
    'mapRoot', 'module', 'newLine', 'noEmit', 'noEmitHelpers', 'noEmitOnError', 'noImplicitAny', 'noLib', 'noResolve',
    'preserveConstEnums', 'removeComments', 'sourceRoot', 'sourceMap', 'stripInternal', 'suppressExcessPropertyErrors',
    'suppressImplicitAnyIndexErrors', 'target', 'verbose', 'jsx', 'moduleResolution', 'experimentalAsyncFunctions', 'rootDir',
    'emitGruntEvents', 'reactNamespace', 'skipDefaultLibCheck', 'pretty', 'allowUnusedLabels', 'noImplicitReturns',
    'noFallthroughCasesInSwitch', 'allowUnreachableCode', 'forceConsistentCasingInFileNames', 'allowJs', 'noImplicitUseStrict'], delayTemplateExpansion = ['htmlModuleTemplate', 'htmlVarTemplate', 'htmlOutputTemplate'];
let templateProcessor = null;
let globExpander = null;
function noopTemplateProcessor(templateString, options) {
    return templateString;
}
function emptyGlobExpander(globs) {
    return [];
}
emptyGlobExpander.isStub = true;
function resolveAsync(rawTaskOptions, rawTargetOptions, targetName = '', resolvedFiles = [], theTemplateProcessor = null, theGlobExpander = null) {
    let result = emptyOptionsResolveResult();
    return new es6_promise_1.Promise((resolve, reject) => {
        if (theTemplateProcessor && typeof theTemplateProcessor === 'function') {
            templateProcessor = theTemplateProcessor;
        }
        else {
            templateProcessor = noopTemplateProcessor;
        }
        if (theGlobExpander && typeof theGlobExpander === 'function') {
            globExpander = theGlobExpander;
        }
        else {
            globExpander = emptyGlobExpander;
        }
        fixMissingOptions(rawTaskOptions);
        fixMissingOptions(rawTargetOptions);
        {
            const { errors, warnings } = resolveAndWarnOnConfigurationIssues(rawTaskOptions, rawTargetOptions, targetName);
            result.errors.push(...errors);
            result.warnings.push(...warnings);
        }
        result = applyGruntOptions(result, rawTaskOptions);
        result = applyGruntOptions(result, rawTargetOptions);
        result = copyCompilationTasks(result, resolvedFiles, resolveOutputOptions(rawTaskOptions, rawTargetOptions));
        visualStudioOptionsResolver_1.resolveVSOptionsAsync(result, rawTaskOptions, rawTargetOptions, templateProcessor).then((result) => {
            tsconfig_1.resolveAsync(result, rawTaskOptions, rawTargetOptions, templateProcessor, globExpander).then((result) => {
                result = addressAssociatedOptionsAndResolveConflicts(result);
                result = enclosePathsInQuotesIfRequired(result);
                result = logAdditionalConfigurationWarnings(result);
                result = applyGruntTSDefaults(result);
                if (result.targetName === undefined ||
                    (!result.targetName && targetName)) {
                    result.targetName = targetName;
                }
                return resolve(result);
            }).catch((tsConfigError) => {
                result.errors.push('tsconfig error: ' + JSON.stringify(tsConfigError));
                return resolve(result);
            });
        }).catch((vsConfigError) => {
            result.errors.push('Visual Studio config issue: ' + JSON.stringify(vsConfigError));
            return resolve(result);
        });
    });
}
exports.resolveAsync = resolveAsync;
function resolveOutputOptions(rawTaskOptions, rawTargetOptions) {
    const result = {};
    const props = ['outDir', 'out'];
    const options = [rawTaskOptions, rawTargetOptions];
    options.forEach((opt) => {
        props.forEach((prop) => {
            if (opt && (prop in opt)) {
                result[prop] = opt[prop];
            }
        });
    });
    return result;
}
function fixMissingOptions(config) {
    if (config && !config.options) {
        config.options = {};
    }
}
function emptyOptionsResolveResult() {
    return {
        warnings: [],
        errors: []
    };
}
function logAdditionalConfigurationWarnings(options) {
    return options;
}
function resolveAndWarnOnConfigurationIssues(task, target, targetName) {
    let errors = [], warnings = [];
    const lowercaseTargetProps = _.map(propertiesFromTarget, (prop) => prop.toLocaleLowerCase());
    const lowercaseTargetOptionsProps = _.map(propertiesFromTargetOptions, (prop) => prop.toLocaleLowerCase());
    checkFixableCaseIssues(task, 'ts task');
    checkFixableCaseIssues(target, `target "${targetName}"`);
    checkLocations(task, 'ts task');
    checkLocations(target, `target "${targetName}"`);
    fixFilesUsedWithFast(task, 'ts task');
    fixFilesUsedWithFast(target, `target "${targetName}"`);
    warnings.push(...getAdditionalWarnings(task, target, targetName));
    return { errors: errors, warnings: warnings };
    function getAdditionalWarnings(task, target, targetName) {
        const additionalWarnings = [];
        if (propertiesFromTarget.indexOf(targetName) >= 0) {
            additionalWarnings.push(`Warning: Using the grunt-ts keyword "${targetName}" as a target name may cause ` +
                `incorrect behavior or errors.`);
        }
        if (((task && task.src && targetName !== 'src') || (target && target.src)) &&
            ((task && task.files) || (target && target.files))) {
            additionalWarnings.push(`Warning: In task "${targetName}", either "files" or "src" should be used - not both.`);
        }
        if (((task && task.vs) || (target && target.vs)) &&
            ((task && task.files) || (target && target.files))) {
            additionalWarnings.push(`Warning: In task "${targetName}", either "files" or "vs" should be used - not both.`);
        }
        if (usingDestArray(task) || usingDestArray(target)) {
            additionalWarnings.push(`Warning: target "${targetName}" has an array specified for the files.dest property.` +
                `  This is not supported.  Taking first element and ignoring the rest.`);
        }
        if ((task && task.outFile) || (target && target.outFile)) {
            additionalWarnings.push(`Warning: target "${targetName}" is using "outFile".  This is not supported by` +
                ` grunt-ts via the Gruntfile - it's only relevant when present in tsconfig.json file.  Use "out" instead.`);
        }
        return additionalWarnings;
        function usingDestArray(task) {
            let result = false;
            if (task && task.files && _.isArray(task.files)) {
                task.files.forEach(item => {
                    if (_.isArray(item.dest)) {
                        result = true;
                    }
                    ;
                });
            }
            return result;
        }
    }
    function fixFilesUsedWithFast(task, configName) {
        if (task && task.files && task.options && task.options.fast) {
            warnings.push(`Warning: ${configName} is attempting to use fast compilation with "files".  ` +
                `This is not currently supported.  Setting "fast" to "never".`);
            task.options.fast = 'never';
        }
    }
    function checkLocations(task, configName) {
        if (task) {
            for (let propertyName in task) {
                if (propertiesFromTarget.indexOf(propertyName) === -1 && propertyName !== 'options') {
                    if (propertiesFromTargetOptions.indexOf(propertyName) > -1 &&
                        !_.isPlainObject(task[propertyName])) {
                        let warningText = `Property "${propertyName}" in ${configName} is possibly in the wrong place and will be ignored.  ` +
                            `It is expected on the options object.`;
                        warnings.push(warningText);
                    }
                    else if (lowercaseTargetProps.indexOf(propertyName.toLocaleLowerCase()) === -1 &&
                        lowercaseTargetOptionsProps.indexOf(propertyName.toLocaleLowerCase()) > -1 &&
                        !_.isPlainObject(task[propertyName])) {
                        let index = lowercaseTargetOptionsProps.indexOf(propertyName.toLocaleLowerCase());
                        let correctPropertyName = propertiesFromTargetOptions[index];
                        let warningText = `Property "${propertyName}" in ${configName} is possibly in the wrong place and will be ignored.  ` +
                            `It is expected on the options object.  It is also the wrong case and should be ${correctPropertyName}.`;
                        warnings.push(warningText);
                    }
                }
            }
            if (task.options) {
                for (let propertyName in task.options) {
                    if (propertiesFromTargetOptions.indexOf(propertyName) === -1) {
                        if (propertiesFromTarget.indexOf(propertyName) > -1) {
                            let warningText = `Property "${propertyName}" in ${configName} is possibly in the wrong place and will be ignored.  ` +
                                `It is expected on the task or target, not under options.`;
                            warnings.push(warningText);
                        }
                        else if (lowercaseTargetOptionsProps.indexOf(propertyName.toLocaleLowerCase()) === -1
                            && lowercaseTargetProps.indexOf(propertyName.toLocaleLowerCase()) > -1) {
                            let index = lowercaseTargetProps.indexOf(propertyName.toLocaleLowerCase());
                            let correctPropertyName = propertiesFromTarget[index];
                            let warningText = `Property "${propertyName}" in ${configName} is possibly in the wrong place and will be ignored.  ` +
                                `It is expected on the task or target, not under options.  It is also the wrong case and should be ${correctPropertyName}.`;
                            warnings.push(warningText);
                        }
                    }
                }
            }
        }
    }
    function checkFixableCaseIssues(task, configName) {
        if (task) {
            for (let propertyName in task) {
                if ((propertiesFromTarget.indexOf(propertyName) === -1)
                    && (lowercaseTargetProps.indexOf(propertyName.toLocaleLowerCase()) > -1)
                    && (propertiesFromTargetOptions.indexOf(propertyName) === -1)) {
                    let index = lowercaseTargetProps.indexOf(propertyName.toLocaleLowerCase());
                    let correctPropertyName = propertiesFromTarget[index];
                    let warningText = `Property "${propertyName}" in ${configName} is incorrectly cased; it should ` +
                        `be "${correctPropertyName}".  Fixing it for you and proceeding.`;
                    warnings.push(warningText);
                    task[correctPropertyName] = task[propertyName];
                    delete task[propertyName];
                }
            }
            for (let propertyName in task.options) {
                if ((propertiesFromTargetOptions.indexOf(propertyName) === -1)
                    && (lowercaseTargetOptionsProps.indexOf(propertyName.toLocaleLowerCase()) > -1)
                    && (propertiesFromTarget.indexOf(propertyName) === -1)) {
                    let index = lowercaseTargetOptionsProps.indexOf(propertyName.toLocaleLowerCase());
                    let correctPropertyName = propertiesFromTargetOptions[index];
                    let warningText = `Property "${propertyName}" in ${configName} options is incorrectly cased; it should ` +
                        `be "${correctPropertyName}".  Fixing it for you and proceeding.`;
                    warnings.push(warningText);
                    task.options[correctPropertyName] = task.options[propertyName];
                    delete task.options[propertyName];
                }
            }
        }
    }
}
function applyGruntOptions(applyTo, gruntOptions) {
    if (gruntOptions) {
        for (const propertyName of propertiesFromTarget) {
            if (propertyName in gruntOptions && propertyName !== 'vs') {
                if (typeof gruntOptions[propertyName] === 'string' && utils.hasValue(gruntOptions[propertyName]) &&
                    delayTemplateExpansion.indexOf(propertyName) === -1) {
                    applyTo[propertyName] = templateProcessor(gruntOptions[propertyName], {});
                }
                else {
                    applyTo[propertyName] = gruntOptions[propertyName];
                }
            }
        }
        if (gruntOptions.options) {
            for (const propertyName of propertiesFromTargetOptions) {
                if (propertyName in gruntOptions.options) {
                    if (typeof gruntOptions.options[propertyName] === 'string' && utils.hasValue(gruntOptions.options[propertyName]) &&
                        delayTemplateExpansion.indexOf(propertyName) === -1) {
                        applyTo[propertyName] = templateProcessor(gruntOptions.options[propertyName], {});
                    }
                    else {
                        applyTo[propertyName] = gruntOptions.options[propertyName];
                    }
                }
            }
        }
    }
    return applyTo;
}
function copyCompilationTasks(options, resolvedFiles, outputInfo) {
    if (!utils.hasValue(options.CompilationTasks)) {
        options.CompilationTasks = [];
    }
    if (!utils.hasValue(resolvedFiles) || resolvedFiles.length === 0) {
        if (options.CompilationTasks.length === 0 && (('outDir' in outputInfo) || ('out' in outputInfo))) {
            const newCompilationTask = {
                src: []
            };
            if ('outDir' in outputInfo) {
                newCompilationTask.outDir = outputInfo.outDir;
            }
            if ('out' in outputInfo) {
                newCompilationTask.outDir = outputInfo.outDir;
            }
            options.CompilationTasks.push(newCompilationTask);
        }
        return options;
    }
    for (let i = 0; i < resolvedFiles.length; i += 1) {
        let glob;
        const orig = resolvedFiles[i].orig;
        if (orig && ('src' in orig)) {
            glob = [].concat(orig.src);
        }
        let compilationSet = {
            src: _.map(resolvedFiles[i].src, (fileName) => utils.enclosePathInQuotesIfRequired(fileName)),
            out: utils.enclosePathInQuotesIfRequired(resolvedFiles[i].out),
            outDir: utils.enclosePathInQuotesIfRequired(resolvedFiles[i].outDir),
            glob: glob
        };
        if ('dest' in resolvedFiles[i] && resolvedFiles[i].dest) {
            let dest;
            if (_.isArray(resolvedFiles[i].dest)) {
                dest = resolvedFiles[i].dest[0];
            }
            else {
                dest = resolvedFiles[i].dest;
            }
            if (utils.isJavaScriptFile(dest)) {
                compilationSet.out = dest;
            }
            else {
                compilationSet.outDir = dest;
            }
        }
        options.CompilationTasks.push(compilationSet);
    }
    return options;
}
function enclosePathsInQuotesIfRequired(options) {
    if (options.rootDir) {
        options.rootDir = utils.enclosePathInQuotesIfRequired(options.rootDir);
    }
    if (options.mapRoot) {
        options.mapRoot = utils.enclosePathInQuotesIfRequired(options.mapRoot);
    }
    if (options.sourceRoot) {
        options.sourceRoot = utils.enclosePathInQuotesIfRequired(options.sourceRoot);
    }
    return options;
}
function addressAssociatedOptionsAndResolveConflicts(options) {
    if (options.emitDecoratorMetadata) {
        options.experimentalDecorators = true;
    }
    if (options.inlineSourceMap && options.sourceMap) {
        options.warnings.push('TypeScript cannot use inlineSourceMap and sourceMap together.  Ignoring sourceMap.');
        options.sourceMap = false;
    }
    if (options.inlineSources && !options.sourceMap) {
        options.inlineSources = true;
        options.inlineSourceMap = true;
        options.sourceMap = false;
    }
    if ('comments' in options && 'removeComments' in options) {
        options.warnings.push(`WARNING: Option "comments" and "removeComments" should not be used together.  ` +
            `The --removeComments value of ${!!options.removeComments} supercedes the --comments value of ${!!options.comments}`);
    }
    if ('comments' in options && !('removeComments' in options)) {
        options.comments = !!options.comments;
        options.removeComments = !options.comments;
    }
    else if (!('comments' in options) && ('removeComments' in options)) {
        options.removeComments = !!options.removeComments;
        options.comments = !options.removeComments;
    }
    if ('html' in options &&
        (options.CompilationTasks.length === 0 ||
            !_.some(options.CompilationTasks, item => ((item.src || []).length > 0 || (item.glob || []).length > 0)))) {
        options.errors.push(`ERROR: option "html" provided without corresponding TypeScript source files or glob to ` +
            `compile.  The transform will not occur unless grunt-ts also expects to compile some files.`);
    }
    options.CompilationTasks.forEach(compileTask => {
        if (compileTask.out && compileTask.outDir) {
            options.warnings.push('The parameter `out` is incompatible with `outDir`; pass one or the other - not both.  Ignoring `out` and using `outDir`.');
            compileTask.out = '';
        }
    });
    return options;
}
function applyGruntTSDefaults(options) {
    if (!('sourceMap' in options) && !('inlineSourceMap' in options)) {
        options.sourceMap = defaults_1.GruntTSDefaults.sourceMap;
    }
    if (!('target' in options)) {
        options.target = defaults_1.GruntTSDefaults.target;
    }
    if (!('fast' in options)) {
        options.fast = defaults_1.GruntTSDefaults.fast;
    }
    if (!('compile' in options)) {
        options.compile = defaults_1.GruntTSDefaults.compile;
    }
    if (!('htmlOutDir' in options)) {
        options.htmlOutDir = null;
    }
    if (!('htmlOutDirFlatten' in options)) {
        options.htmlOutDirFlatten = defaults_1.GruntTSDefaults.htmlOutDirFlatten;
    }
    if (!('htmlModuleTemplate' in options)) {
        options.htmlModuleTemplate = defaults_1.GruntTSDefaults.htmlModuleTemplate;
    }
    if (!('htmlVarTemplate' in options)) {
        options.htmlVarTemplate = defaults_1.GruntTSDefaults.htmlVarTemplate;
    }
    if (!('removeComments' in options) && !('comments' in options)) {
        options.removeComments = defaults_1.GruntTSDefaults.removeComments;
    }
    if (!('failOnTypeErrors' in options)) {
        options.failOnTypeErrors = defaults_1.GruntTSDefaults.failOnTypeErrors;
    }
    if (!('emitGruntEvents' in options)) {
        options.emitGruntEvents = defaults_1.GruntTSDefaults.emitGruntEvents;
    }
    return options;
}
