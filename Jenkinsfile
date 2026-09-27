// Foundation CI only. Image publishing and deployment are separate next steps.
// Configure this Pipeline-from-SCM job for the original repository's main only.
pipeline {
  agent { label 'personal-site-build' }
  options {
    disableConcurrentBuilds()
    skipDefaultCheckout(true)
    timeout(time: 20, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '30', daysToKeepStr: '30'))
  }
  triggers { pollSCM('H/2 * * * *') }
  environment {
    NEXT_TELEMETRY_DISABLED = '1'
    NODE_OPTIONS = '--max-old-space-size=1536'
  }
  stages {
    stage('Checkout trusted main') {
      steps {
        git branch: 'main', url: 'https://github.com/Undery33/Introduce_Page.git'
        script { env.BUILD_COMMIT = sh(script: 'git rev-parse HEAD', returnStdout: true).trim() }
      }
    }
    stage('Install') { steps { sh 'npm ci --no-fund' } }
    stage('Validate') { steps { sh 'npm run check' } }
    stage('Build') { steps { sh 'npm run build' } }
    stage('HTTP verification') { steps { sh 'EXPECTED_COMMIT="$BUILD_COMMIT" npm run test:smoke' } }
  }
}
