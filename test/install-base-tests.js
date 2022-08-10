'use strict';

const {expect} = require('chai');
const fs = require('fs-extra');

describe('Base Installer', function () {
  it('should copy toggler.mustache to /source/_patterns/00-elements/', function () {
    expect(fs.existsSync('source/_patterns/00-elements/toggler.mustache')).to.be.true;
  });

  it('should populate paragraph.mustache with : "{{{ toggler_content }}}"', function () {
    const content = fs.readFileSync('source/_patterns/00-elements/toggler.mustache', 'utf8');

    expect(content).to.equal('{{{ toggler_content }}}\n');
  });
});
