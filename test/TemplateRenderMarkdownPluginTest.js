const test = require("ava");
const TemplateRender = require("../src/TemplateRender");
const TemplateConfig = require("../src/TemplateConfig");
const EleventyExtensionMap = require("../src/EleventyExtensionMap");
const md = require("markdown-it");

function getNewTemplateRender(name, inputDir) {
  let eleventyConfig = new TemplateConfig();
  let tr = new TemplateRender(name, inputDir, eleventyConfig);
  tr.extensionMap = new EleventyExtensionMap([], eleventyConfig);
  return tr;
}

const createTestMarkdownPlugin = () => {
  const plugin = (md) => {
    md.core.ruler.after("inline", "replace-link", function (state) {
      plugin.environment = state.env;
      const link = state.tokens[1].children[0].attrs[0][1];
      state.tokens[1].children[0].attrs[0][1] = `${link}?data=${state.env.some}`;
      return false;
    });
  };
  plugin.environment = {};
  return plugin;
};

test("Markdown Render: with HTML prerender, sends context data to the markdown library", async (t) => {
  let tr = getNewTemplateRender("md");

  const plugin = createTestMarkdownPlugin();
  let mdLib = md().use(plugin);
  tr.engine.setLibrary(mdLib);

  const data = { some: "data" };

  let fn = await tr.getCompiledTemplate("[link text](http://link.com)");
  let result = await fn(data);
  t.deepEqual(plugin.environment, data);
  t.is(result, '<p><a href="http://link.com?data=data">link text</a></p>\n');
});

test("Markdown Render: without HTML prerender, sends context data to the markdown library", async (t) => {
  let tr = getNewTemplateRender("md");

  const plugin = createTestMarkdownPlugin();
  let mdLib = md().use(plugin);
  tr.engine.setLibrary(mdLib);
  tr.setHtmlEngine(false);

  const data = { some: "data" };

  let fn = await tr.getCompiledTemplate("[link text](http://link.com)");
  let result = await fn(data);
  t.deepEqual(plugin.environment, data);
  t.is(result, '<p><a href="http://link.com?data=data">link text</a></p>\n');
});

test("Markdown Render: renderer that only implements the render function", async (t) => {
  let tr = getNewTemplateRender("md");
  tr.engine.setLibrary({
    render: (content) => {
      const [_, text, href] = content.match(/\[(.*)\]\((.*)\)/);
      return `<p><a href="${href}">${text}</a></p>\n`;
    },
  });
  tr.setHtmlEngine(false);

  let fn = await tr.getCompiledTemplate("[link text](http://link.com)");
  let result = await fn();
  t.is(result, '<p><a href="http://link.com">link text</a></p>\n');
});
