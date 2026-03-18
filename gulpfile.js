var gulp = require('gulp');
var csso = require('gulp-csso');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var sass = require('gulp-sass')(require('sass'));
var plumber = require('gulp-plumber');
var fs = require('fs');
var imagemin = require('gulp-imagemin');
var browserSync = require('browser-sync');

// Site variables from _config.yml
var siteConfig = {
  title: "Shoshanna's Portfolio",
  description: "This is a portfolio website to document and share code and UX projects I've worked on.",
  username: "Shoshanna Thomas-McCue",
  user_title: "Software Developer",
  user_description: "Hi, I'm Shoshanna. I'm certified in UX Design and Research and hold a Bachelor of Science in Software Development. I love building thoughtful software that makes a positive impact on those who use it.",
  email: "contact@shoshannatm.dev",
  github_username: "shoshannaTM",
  baseurl: ""
};

/*
 * Build HTML by inlining Jekyll includes and resolving Liquid variables.
 * Replaces Jekyll entirely — no Ruby required.
 */
function buildHtml(done) {
  var head     = fs.readFileSync('_includes/head.html', 'utf8');
  var header   = fs.readFileSync('_includes/header.html', 'utf8');
  var about    = fs.readFileSync('_includes/about.html', 'utf8');
  var projects = fs.readFileSync('_includes/projects.html', 'utf8');
  var footer   = fs.readFileSync('_includes/footer.html', 'utf8');
  var layout   = fs.readFileSync('_layouts/default.html', 'utf8');

  var html = '<!DOCTYPE html>\n<html lang="en">\n' + layout + '\n</html>';

  // Inline includes
  html = html.replace(/\{%\s*include head\.html\s*%\}/g, head);
  html = html.replace(/\{%\s*include header\.html\s*%\}/g, header);
  html = html.replace(/\{%\s*include about\.html\s*%\}/g, about);
  html = html.replace(/\{%\s*include projects\.html\s*%\}/g, projects);
  html = html.replace(/\{%\s*include footer\.html\s*%\}/g, footer);
  html = html.replace(/\{%\s*include google-analytics\.html\s*%\}/g, '');
  html = html.replace(/\{\{\s*content\s*\}\}/g, '');

  // Resolve conditionals (page.title / page.description fallbacks)
  html = html.replace(/\{%\s*if page\.title\s*%\}[\s\S]*?\{%\s*else\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g, '$1');
  html = html.replace(/\{%\s*if page\.description[\s\S]*?\{%\s*else\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g, siteConfig.description);

  // Resolve site variables
  html = html.replace(/\{\{\s*site\.title\s*\}\}/g, siteConfig.title);
  html = html.replace(/\{\{\s*site\.username\s*\}\}/g, siteConfig.username);
  html = html.replace(/\{\{\s*site\.user_title\s*\}\}/g, siteConfig.user_title);
  html = html.replace(/\{\{\s*site\.user_description\s*\}\}/g, siteConfig.user_description);
  html = html.replace(/\{\{\s*site\.email\s*\}\}/g, siteConfig.email);
  html = html.replace(/\{\{\s*site\.github_username\s*\}\}/g, siteConfig.github_username);

  // Resolve Liquid asset path filters  e.g. {{ "/assets/css/main.css" | prepend: site.baseurl }}
  html = html.replace(/\{\{\s*["']([^"']+)["']\s*\|\s*prepend:\s*site\.baseurl\s*\}\}/g, siteConfig.baseurl + '$1');
  // Resolve bare string literals  e.g. {{ "assets/img/foo.png" }}
  html = html.replace(/\{\{\s*["']([^"']+)["']\s*\}\}/g, '$1');

  // Strip any remaining Liquid tags/variables
  html = html.replace(/\{%[^%]*%\}/g, '');
  html = html.replace(/\{\{[^}]*\}\}/g, '');

  if (!fs.existsSync('_site')) fs.mkdirSync('_site');
  fs.writeFileSync('_site/index.html', html);
  done();
}

gulp.task('build-html', buildHtml);

/*
 * Copy compiled assets into _site so browser-sync can serve them
 */
gulp.task('copy-assets', function() {
  return gulp.src('assets/**/*')
    .pipe(gulp.dest('_site/assets/'));
});

/*
 * Rebuild HTML & assets, then reload browserSync
 */
gulp.task('jekyll-rebuild', gulp.series(['build-html', 'copy-assets'], function(done) {
  browserSync.reload();
  done();
}));

/*
 * Build the site and launch browser-sync
 */
gulp.task('browser-sync', gulp.series(['build-html', 'copy-assets'], function(done) {
  browserSync({
    server: {
      baseDir: '_site'
    }
  });
  done();
}));

/*
* Compile and minify sass
*/
gulp.task('sass', function() {
  return gulp.src('src/styles/**/*.scss')
    .pipe(plumber())
    .pipe(sass())
    .pipe(csso())
		.pipe(gulp.dest('assets/css/'))
});

/*
* Compile fonts
*/
gulp.task('fonts', function() {
	return gulp.src('src/fonts/**/*.{ttf,woff,woff2}')
		.pipe(plumber())
		.pipe(gulp.dest('assets/fonts/'))
});

/*
 * Minify images
 */
gulp.task('imagemin', function() {
	return gulp.src('src/img/**/*.{jpg,png,gif}')
		.pipe(plumber())
		.pipe(imagemin({ optimizationLevel: 3, progressive: true, interlaced: true }))
		.pipe(gulp.dest('assets/img/'))
});

/**
 * Compile and minify js
 */
gulp.task('js', function() {
	return gulp.src('src/js/**/*.js')
		.pipe(plumber())
		.pipe(concat('main.js'))
		.pipe(uglify())
		.pipe(gulp.dest('assets/js/'))
});

gulp.task('watch', function() {
  gulp.watch('src/styles/**/*.scss', gulp.series(['sass', 'jekyll-rebuild']));
  gulp.watch('src/js/**/*.js', gulp.series(['js', 'jekyll-rebuild']));
  gulp.watch('src/fonts/**/*.{tff,woff,woff2}', gulp.series(['fonts']));
  gulp.watch('src/img/**/*.{jpg,png,gif}', gulp.series(['imagemin']));
  gulp.watch(['*html', '_includes/*html', '_layouts/*.html'], gulp.series(['jekyll-rebuild']));
});

gulp.task('default', gulp.series(['js', 'sass', 'fonts', 'browser-sync', 'watch']));
