module.exports = (grunt) ->
    # load all grunt tasks
    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks)
    
    # load package config
    pkg = grunt.file.readJSON('package.json')

    # load dist config
    config = grunt.file.readYAML('project.yml')

    grunt.initConfig 


        # nodemon
        nodemon:
            options:
                args: ['development']
                nodeArgs: ['--debug']
                watch: [
                    'app'
                ]
                legacyWatch: true

            # nodemon.server
            server:
                script: config.bin.server
                options:
                    callback: (nodemon) ->
                        nodemon.on 'log', (evt) ->
                            console.log evt.colour

                        nodemon.on 'restart', () ->
                            console.log 'restart server.'


        # inspector for debugging
        'node-inspector':
            dev:
                options:
                    'save-live-edit': true


        # open browser for inspector
        open:
            dev:
                path: 'http://127.0.0.1:8080/debug?port=5858'



        concurrent:
            options:
                logConcurrentOutput: true
            server:
                tasks: [
                    'nodemon:server'
                    'node-inspector:dev'
                ]


        # shell
        shell:
            distbeta: 
                command: [
                    "rsync -avz -e \"ssh\" --exclude-from '.distignore' --exclude='.git/' --chmod='a=r,u+w,D+x' ./ ubuntu@" + config.beta.host + ":/home/ubuntu/" + config.path + "/"
                    "ssh ubuntu@" + config.beta.host + " forever restart " + config.path + config.bin.server
                ].join('&&')
                options:
                    stdout: true
                    async: false



    # register task
    grunt.registerTask 'default', () ->
        grunt.task.run [
            'concurrent:server'
        ]

    grunt.registerTask 'dist:beta', () ->
        grunt.task.run [
            'shell:distbeta'
        ]
