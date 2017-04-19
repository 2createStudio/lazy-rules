#!/usr/bin/env node

/**
 * The modules.
 */
const globby = require('globby');
const watch = require('watch');
const slash = require('slash');
const prog = require('caporal');
const sizeOf = require('image-size');
const kebabCase = require('lodash.kebabcase');
const sortBy = require('lodash.sortby');
const groupBy = require('lodash.groupby');
const map = require('lodash.map');
const path = require('path');
const fs = require('fs-promise');
const pkg = require('./package.json');

/**
 * Get the image ratio.
 *
 * @param  {String} file
 * @return {Number}
 */
const getRatio = (file) => {
	const name = path.basename(file);
	const matches = /@(\d)x\.[a-z]{3,4}$/gi.exec(file);

	return matches ? parseInt(matches[1], 10) : 1;
};

/**
 * Convert filename to a valid CSS selector.
 *
 * @param  {String} file
 * @return {String}
 */
const getSelector = (file) => {
	let name = path.basename(file);
	let base, pseudo;

	name = name.replace(/(@\d+x)?\..+$/gi, '');

	if (/\_/.test(name)) {
		base = name.replace(name.split('_').pop(), '');
		pseudo = name.split('_').pop();
	}

	if (base && pseudo) {
		return (
`.${base}-${pseudo},
a:${pseudo} .${base},
button:${pseudo} .${base},
a.${pseudo} .${base},
button.${pseudo} .${base},
.${base}.${pseudo}`
		);
	}

	return `.${kebabCase(name)}`;
};

/**
 * Convert each one of the paths to an Image object.
 *
 * @param  {String[]} images
 * @param  {String}   stylesheet
 * @return {Object[]}
 */
const prepareImages = (images, stylesheet) => {
	images = images.map((image) => {
		const url = slash(path.relative(path.dirname(stylesheet), image));
		const size = sizeOf(image);
		const ratio = getRatio(image);
		const selector = getSelector(image);

		return {
			url,
			size,
			ratio,
			selector,
		};
	});

	images = sortBy(images, 'ratio');
	images = groupBy(images, 'ratio');

	return images;
};

/**
 * Generate CSS rules for the given objects.
 *
 * @param  {Object[]} images
 * @param  {Number}   ratio
 * @return {String}
 */
const compileCSS = (images, ratio) => {
	images = images.map((image) => {
		return (
`${image.selector} { background: url(${image.url}) no-repeat 0 0; background-size: 100% 100%; width: ${image.size.width/image.ratio}px; height: ${image.size.height/image.ratio}px; display: inline-block; vertical-align: middle; font-size: 0; }`
		);
	});

	images = images.join('\n');

	if (ratio > 1) {
		return (
`@media (-webkit-min-device-pixel-ratio: ${ratio}), (min-resolution: ${ratio * 96}dpi) {
	${images}
}`
		);
	}

	return images;
};

/**
 * Process the images and generate the CSS rules.
 *
 * @param  {String}  images
 * @param  {String}  stylesheet
 * @param  {Object}  opts
 * @param  {Object}  logger
 * @return {Promise}
 */
const processImages = (images, stylesheet, opts, logger) => {
	globby(images)
		.then((paths) => prepareImages(paths, stylesheet))
		.then((groups) => map(groups, compileCSS))
		.then((groups) => fs.outputFileSync(stylesheet, groups.join('\n\n')))
		.then(() => logger.info(`LazyRules: stylesheet generated at - ${stylesheet}`))
		.catch((e) => logger.error(`LazyRules: an error was encountered - ${e.message}`));
};

/**
 * Setup the handlers.
 */
const handler = ({ images, stylesheet }, opts, logger) => {
	if (opts.watch) {
		watch.watchTree(path.dirname(images), () => {
			processImages(images, stylesheet, opts, logger);
		});
	} else {
		processImages(images, stylesheet, opts, logger);
	}
};

/**
 * Setup the program.
 */
prog
	.version(pkg.version)
	.description(pkg.description)
	.argument('<images>', 'Path to the images')
	.argument('<stylesheet>', 'Path to the output stylesheet')
	.option('--watch', 'Watch for file changes')
	.action(handler);

/**
 * Start the program.
 */
prog.parse(process.argv);
