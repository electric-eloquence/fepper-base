'use strict';

const conf = global.conf;
const pref = global.pref;

const diveSync = require('diveSync');
const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');

const utils = require('../lib/utils');

const patternsDir = utils.pathResolve(conf.ui.paths.public.patterns);
const sourceDir = utils.pathResolve(conf.ui.paths.public.root, true);
const staticSuffix = 'static';
const staticDir = utils.pathResolve(`${conf.ui.paths.source.root}/${staticSuffix}`);

const assetsDir = utils.pathResolve(conf.ui.paths.public.images, true);
const assetsSuffix = assetsDir.replace(`${sourceDir}/`, '');
const scriptsDir = utils.pathResolve(conf.ui.paths.public.js, true);
const stylesDir = utils.pathResolve(conf.ui.paths.public.css, true);
const stylesSuffix = stylesDir.replace(`${sourceDir}/`, '');

exports.assetsDirCopy = function () {
  fs.copySync(assetsDir, `${staticDir}/${assetsSuffix}`);
};

exports.scriptsDirCopy = function () {
  diveSync(
    scriptsDir,
    {
      recursive: false,
      directories: true,
      filter: function (path, dir) {
        return dir;
      }
    },
    function (err, file) {
      if (err) {
        throw err;
      }
      var suffix = file.replace(`${sourceDir}/`, '');
      fs.copySync(file, `${staticDir}/${suffix}`);
    }
  );
};

exports.stylesDirCopy = function () {
  fs.copySync(stylesDir, `${staticDir}/${stylesSuffix}`);
};

exports.pagesDirCompile = function () {
  var dataJson = utils.data();
  var dirs = [];
  var f;
  var files = [];
  var i;
  var j;
  var tmpArr = [];
  var tmpStr = '';

  // Glob page files in public/patterns.
  dirs = glob.sync(patternsDir + '/04-pages-*');

  for (i = 0; i < dirs.length; i++) {
    tmpArr = glob.sync(dirs[i] + '/*');
    for (j = 0; j < tmpArr.length; j++) {
      files.push(tmpArr[j]);
    }
  }

  for (i = 0; i < files.length; i++) {
    f = files[i];
    if (
      (f.indexOf('html') === f.length - 4) &&
      (f.indexOf('markup-only.html') !== f.length - 16) &&
      path.basename(f) !== 'index.html'
    ) {
      tmpStr = fs.readFileSync(f, conf.enc);

      /* eslint-disable max-len */
      // Strip Pattern Lab css and js.
      tmpStr = tmpStr.replace(/\s*<!\-\- Begin Pattern Lab \(Required for Pattern Lab to run properly\) \-\->[\S\s]*?<!\-\- End Pattern Lab \-\->/g, '');

      /* eslint-enable max-len */
      // Strip cacheBuster params.
      tmpStr = tmpStr.replace(/((href|src)="[^"]*)\?\d*"/g, '$1"');
      // Fix paths.
      tmpStr = tmpStr.replace(/(href|src)\s*=\s*("|')..\/..\//g, '$1=$2');
      // Strip addition js.
      tmpStr = tmpStr.replace(/\s*<script src="_scripts\/pattern\-overrider.js"><\/script>/, '');
      // Replace homepage filename with "index.html"
      if (dataJson.homepage) {
        let homepageRegex = new RegExp('(href\\s*=\\s*)"[^"]*(\\/|&#x2F;)' + dataJson.homepage, 'g');
        tmpStr = tmpStr.replace(homepageRegex, '$1"index');
        homepageRegex = new RegExp('(href\\s*=\\s*)\'[^\']*(\\/|&#x2F;)' + dataJson.homepage, 'g');
        tmpStr = tmpStr.replace(homepageRegex, '$1\'index');
      }
      // Strip prefix from remaining page filenames.
      tmpStr = tmpStr.replace(/(href\s*=\s*)"[^"]*(\/|&#x2F;)04\-pages\-/g, '$1"');
      tmpStr = tmpStr.replace(/(href\s*=\s*)'[^']*(\/|&#x2F;)04\-pages\-/g, '$1\'');

      // Copy homepage to index.html.
      if (dataJson.homepage && f.indexOf(dataJson.homepage + '.html') === (f.length - dataJson.homepage.length - 5)) {
        fs.writeFileSync(staticDir + '/index.html', tmpStr);
      }
      else {
        fs.writeFileSync(staticDir + '/' + f.replace(/^.*\/04\-pages\-/, ''), tmpStr);
      }
    }
  }
};

exports.main = function () {
  var webservedDirsFull;
  var webservedDirsShort;

  // Delete old static dir. Then, recreate it.
  fs.removeSync(staticDir);
  fs.mkdirSync(staticDir);

  // Copy asset directories.
  exports.assetsDirCopy();
  exports.scriptsDirCopy();
  exports.stylesDirCopy();

  // Copy pages directory.
  exports.pagesDirCompile();

  // Copy webserved directories.
  if (Array.isArray(pref.backend.webserved_dirs)) {
    webservedDirsFull = pref.backend.webserved_dirs;
  }

  if (webservedDirsFull) {
    webservedDirsShort = utils.webservedDirnamesTruncate(webservedDirsFull);
    utils.webservedDirsCopy(webservedDirsFull, webservedDirsShort, staticDir);
  }
};