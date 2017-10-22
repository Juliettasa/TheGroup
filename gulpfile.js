var gulp = require('gulp'),
    sass = require('gulp-sass'),
    csso = require('gulp-csso'),
    gutil = require('gulp-util'),
    clean = require('gulp-clean'),
    merge = require('merge-stream'),
    concat = require('gulp-concat'),
    notify = require('gulp-notify'),
    rename = require("gulp-rename"),
    uglify = require('gulp-uglify'),
    connect = require('gulp-connect'),
    ghPages = require('gulp-gh-pages'),
    imagemin = require('gulp-imagemin'),
    sourcemaps = require('gulp-sourcemaps'),
    minifyHTML = require('gulp-minify-html'),
    spritesmith = require('gulp.spritesmith'),
    autoprefixer = require('gulp-autoprefixer'),
    fileinclude = require('gulp-file-include'),
    browserSync = require('browser-sync').create();

// запуск сервера
gulp.task('server', () => {
    browserSync.init({
        server: {
            baseDir: "./"
        },
        port: "7777"
    });

    gulp.watch(['./**/*.html']).on('change', browserSync.reload);
    gulp.watch('./js/**/*.js').on('change', browserSync.reload);

    gulp.watch([
        './templates/**/*.html',
        './pages/**/*.html'
    ], ['fileinclude']);

    gulp.watch('./sass/**/*', ['sass']);
});

// компіляція sass/scss в css
gulp.task('sass', () => {
    gulp.src(['./sass/**/*.scss', './sass/**/*.sass'])
        .pipe(sourcemaps.init())
        .pipe(
            sass({ outputStyle: 'expanded' })
            .on('error', gutil.log)
        )
        .on('error', notify.onError())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./css/'))
        .pipe(browserSync.stream());
});

// збірка сторінки з шаблонів
gulp.task('fileinclude', () => {
    gulp.src('./templates/index.html')
        .pipe(fileinclude({
            prefix: '@@',
            basepath: '@file'
        }).on('error', gutil.log))
        .on('error', notify.onError())
        .pipe(gulp.dest('./'))
});

// зтиснення svg, png, jpeg
gulp.task('minify:img', () => {
    // беремо всі картинки крім папки де лежать картинки для спрайту
    // картинки зі спрайту упаковуються в окрему картинку
    return gulp.src(['./images/**/*', '!./images/sprite/*'])
        .pipe(imagemin().on('error', gutil.log))
        .pipe(gulp.dest('./dist/images/'));
});

// зтиснення css
// зпочатку запуститься задача sass щоб зкомпілити css файли потім ці файли буди
// зтиснуто та збережено в папці dist/css
gulp.task('minify:css', ['sass'], () => {
    gulp.src('./css/**/*.css')
        // autoprefixer - автоматично додасть вендорні префікси для останнійх 30 версій браузерів
        .pipe(autoprefixer({
            browsers: ['last 30 versions'],
            cascade: false
        }))
        // зстискаємо результат
        .pipe(csso())
        .pipe(gulp.dest('./dist/css/'));
});

// зтиснення js
gulp.task('minify:js', () => {
    gulp.src('./js/**/*.js')
        .pipe(uglify())
        .pipe(gulp.dest('./dist/js/'));
});

// зтиснення html
gulp.task('minify:html', () => {
    let opts = {
        conditionals: true,
        spare: true
    };

    // зтискаємо тільки ті html що лежать в корні
    // ті що в папці templates не беремо
    return gulp.src(['./*.html'])
        .pipe(minifyHTML(opts))
        .pipe(gulp.dest('./dist/'));
});

// видалити папку dist
gulp.task('clean', () => gulp.src('./dist', { read: false }).pipe(clean()));

// створення спрайту з картинок з папки images/sprite
gulp.task('sprite', () => {
    let spriteData = gulp.src('images/sprite/*.png').pipe(
        spritesmith({
            imgName: 'sprite.png',
            cssName: '_icon-mixin.scss',
            cssVarMap: (sprite) => {sprite.name = 'icon-' + sprite.name}
        })
    );

    let imgStream = spriteData.img.pipe(gulp.dest('images/'));
    let cssStream = spriteData.css.pipe(gulp.dest('sass/'));

    return merge(imgStream, cssStream);
});

// публікація все що знаходиться в папці dist на github у вітку gh-pages
gulp.task('deploy', () => gulp.src('./dist/**/*').pipe(ghPages()));

// при виклику в терміналі команди gulp, буде запущені задачі 
// server - для запупуску сервера, 
// sass - для компіляції sass в css, тому що браузер не розуміє попередній синтаксис,
// fileinclude - для того щоб з маленьких шаблонів зібрати повну сторінку
gulp.task('default', ['server', 'sass', 'fileinclude']);

// при виклику команди gulp production
// будуть стиснуті всі ресурси в папку dist
// після чого командою gulp deploy їх можна опублікувати на github
gulp.task('production', ['minify:html', 'minify:css', 'minify:js', 'minify:img']);