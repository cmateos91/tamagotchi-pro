"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatureMood = exports.CreaturePersonality = exports.CreatureStage = exports.CreatureSpecies = void 0;
var CreatureSpecies;
(function (CreatureSpecies) {
    CreatureSpecies["VERDANIA"] = "verdania";
    CreatureSpecies["TERRANIA"] = "terrania";
    CreatureSpecies["AQUARINA"] = "aquarina";
    CreatureSpecies["IGNIUS"] = "ignius";
    CreatureSpecies["GLACIUS"] = "glacius";
    CreatureSpecies["VOLTUS"] = "voltus";
    CreatureSpecies["STELLARIS"] = "stellaris";
    CreatureSpecies["UMBRA"] = "umbra";
})(CreatureSpecies || (exports.CreatureSpecies = CreatureSpecies = {}));
var CreatureStage;
(function (CreatureStage) {
    CreatureStage["EGG"] = "egg";
    CreatureStage["BABY"] = "baby";
    CreatureStage["TEEN"] = "teen";
    CreatureStage["ADULT"] = "adult";
    CreatureStage["ELDER"] = "elder";
})(CreatureStage || (exports.CreatureStage = CreatureStage = {}));
var CreaturePersonality;
(function (CreaturePersonality) {
    CreaturePersonality["TIMIDO"] = "timido";
    CreaturePersonality["AVENTURERO"] = "aventurero";
    CreaturePersonality["GLOTON"] = "gloton";
    CreaturePersonality["PEREZOSO"] = "perezoso";
    CreaturePersonality["ENERGICO"] = "energico";
})(CreaturePersonality || (exports.CreaturePersonality = CreaturePersonality = {}));
var CreatureMood;
(function (CreatureMood) {
    CreatureMood["FELIZ"] = "feliz";
    CreatureMood["TRISTE"] = "triste";
    CreatureMood["HAMBRIENTO"] = "hambriento";
    CreatureMood["CANSADO"] = "cansado";
    CreatureMood["ENFERMO"] = "enfermo";
    CreatureMood["ABURRIDO"] = "aburrido";
    CreatureMood["EMOCIONADO"] = "emocionado";
})(CreatureMood || (exports.CreatureMood = CreatureMood = {}));
//# sourceMappingURL=types.js.map