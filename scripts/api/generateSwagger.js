"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
// @ts-expect-error: jsdoc package does not have TypeScript types
var jsdoc = require("jsdoc");
var apiRoutesDir = path.join(__dirname, 'app/api');
var swaggerOutputPath = path.join(__dirname, 'swagger.json');
function generateSwagger() {
    return __awaiter(this, void 0, void 0, function () {
        var swaggerDoc, files, _i, files_1, file, filePath, doc;
        return __generator(this, function (_a) {
            console.log('Starting Swagger JSON generation...');
            swaggerDoc = {
                openapi: '3.0.0',
                info: {
                    title: 'API Documentation',
                    version: '1.0.0',
                },
                paths: {},
            };
            try {
                files = fs.readdirSync(apiRoutesDir);
                console.log("Found ".concat(files.length, " files in ").concat(apiRoutesDir));
                for (_i = 0, files_1 = files; _i < files_1.length; _i++) {
                    file = files_1[_i];
                    filePath = path.join(apiRoutesDir, file);
                    console.log("Processing file: ".concat(filePath));
                    try {
                        doc = jsdoc.explainSync({ files: filePath });
                        doc.forEach(function (comment) {
                            var _a, _b;
                            var _c, _d, _e;
                            var method = (_c = comment.tags.find(function (tag) { return tag.title === 'method'; })) === null || _c === void 0 ? void 0 : _c.value;
                            var path = (_d = comment.tags.find(function (tag) { return tag.title === 'path'; })) === null || _d === void 0 ? void 0 : _d.value;
                            var summary = (_e = comment.tags.find(function (tag) { return tag.title === 'desc'; })) === null || _e === void 0 ? void 0 : _e.value;
                            var params = comment.tags.filter(function (tag) { return tag.title === 'param'; });
                            var responses = comment.tags.filter(function (tag) { return tag.title === 'response'; });
                            if (method && path && summary) {
                                var swaggerPath = (_a = {},
                                    _a[path] = (_b = {},
                                        _b[method.toLowerCase()] = {
                                            summary: summary,
                                            parameters: params.map(function (param) { return ({
                                                name: param.name,
                                                in: 'query',
                                                required: true,
                                                schema: {
                                                    type: 'string',
                                                },
                                            }); }),
                                            responses: responses.reduce(function (acc, response) {
                                                acc[response.name] = {
                                                    description: response.description,
                                                };
                                                return acc;
                                            }, {}),
                                        },
                                        _b),
                                    _a);
                                swaggerDoc.paths = __assign(__assign({}, swaggerDoc.paths), swaggerPath);
                            }
                        });
                    }
                    catch (error) {
                        console.error("Error processing file ".concat(filePath, ":"), error);
                    }
                }
                fs.writeFileSync(swaggerOutputPath, JSON.stringify(swaggerDoc, null, 2));
                console.log('Swagger JSON file generated at', swaggerOutputPath);
            }
            catch (error) {
                console.error('Error reading API routes directory:', error);
            }
            console.log('Swagger JSON generation completed.');
            return [2 /*return*/];
        });
    });
}
generateSwagger();
