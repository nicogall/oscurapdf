/**
 * Common Italian first names (plus a few frequent in Italy from other languages), lower case.
 * Names that are also ordinary Italian words (Rosa, Bianca, Chiara, Franco, Bruno, Natale,
 * Domenica, Massimo, Marina, Stella, Viola, Serena, Gioia, Felice, Vittoria, Aurora, Sole, Luce,
 * Primo, Leone, Santo, Grazia, Gemma, Margherita, Celeste, Fortunato, Speranza, Norma, Alba, Linda,
 * Gaia, Romano, Assunta, Immacolata, Pino, Lino, Italo…) are left out on
 * purpose: next to another capitalised word they would turn ordinary phrases into "people".
 */
export const ITALIAN_FIRST_NAMES: ReadonlySet<string> = new Set(
 `
 adele adriana adriano agata agnese agostino alberto alda aldo alessandra alessandro alessia alessio alfonso alfredo alice alida
 alma amalia amedeo amelia anastasia andrea angela angelo angelica anita anna annalisa annamaria antonella antonietta antonino
 antonio arianna armando arnaldo arturo attilio augusto barbara battista beatrice benedetta benedetto beniamino bernardo
 bettina biagio brigida calogero camilla carla carlo carmela carmelo carmine carolina caterina cecilia cesare christian cinzia ciro
 clara claudia claudio clelia concetta corrado cosimo costanza costantino cristian cristiano cristina damiano daniela daniele dante
 dario davide debora deborah delia denise diana diego dino domenico donatella donato edoardo elena eleonora elia elisa elisabetta
 elvira emanuela emanuele emilia emiliano emilio emma enrica enrico enzo erica ermanno ernesto ettore eugenia eugenio eva fabiana
 fabio fabrizio fausto federica federico ferdinando fernanda fernando filippo filomena fiorella flavia flavio francesca francesco
 gabriele gabriella gaetano gerardo giacomo giada gianfranco gianluca gianluigi gianmarco gianni gianpaolo giacinto gilberto
 gino giorgia giorgio giovanna giovanni girolamo gisella giuditta giulia giuliana giuliano giulio giuseppa giuseppe giuseppina
 giustina graziella gregorio guglielmo guido ignazio ilaria ines ingrid irene isabella ivan ivana ivo jacopo
 lara laura lazzaro leandro leonardo letizia lia liana liliana lina livia livio lorena lorenzo loredana luana luca lucia
 luciana luciano lucio ludovica luigi luigia luisa maddalena mafalda manuel manuela marcella marcello marco maria mariano
 marianna marilena mario marisa marta martina matilde matteo mattia maurizio mauro michela michele milena mirella
 miriam mirko monica nadia nazzareno nicola nicoletta nicolò nicolo noemi nunzia nunzio olga ornella oreste orlando osvaldo
 ottavio pamela paola paolo pasquale patrizia patrizio pierluigi piero pietro pina raffaele raffaella renata renato riccardo
 rita roberta roberto rocco romeo rosalba rosalia rosanna rosaria rosario rossana rossella ruggero sabrina salvatore samuele
 sandra sandro santina sara saverio sebastiano sergio silvana silvia silvio simona simone sofia sonia stefania stefano susanna
 tania teresa tiziana tiziano tommaso tullio ugo umberto valentina valeria valerio vanessa vanna vincenza vincenzo virginia vito
 vittorio walter wanda yuri zaira
`
 .trim()
 .split(/\s+/u),
);
