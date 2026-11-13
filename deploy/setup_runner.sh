#!/usr/bin/env bash
# ==============================================================================
# SEFI-TI · Urban Style Barber Shop (Medellín)
# Script de Aprovisionamiento de Self-Hosted Runner y Apache2 en WSL / Ubuntu
# ==============================================================================
set -euo pipefail

RUNNER_VERSION="2.319.1"
RUNNER_DIR="$HOME/actions-runner"
APACHE_ROOT="/var/www/html"

echo "[1/5] Actualizando paquetes e instalando Apache2 y dependencias en WSL/Ubuntu..."
sudo apt-get update -y
sudo apt-get install -y apache2 curl tar jq git python3 python3-pip python3-venv nodejs npm

echo "[2/5] Habilitando e iniciando servicio Apache2..."
sudo systemctl enable apache2 || true
sudo service apache2 start

echo "[3/5] Configurando permisos sin contraseña (NOPASSWD) para despliegue automatizado en /var/www/html..."
SUDOERS_FILE="/etc/sudoers.d/sefi-ti-runner"
CURRENT_USER="$(whoami)"
sudo bash -c "cat > ${SUDOERS_FILE}" <<EOF
${CURRENT_USER} ALL=(ALL) NOPASSWD: /bin/rm -rf /var/www/html/*, /bin/cp -r *, /bin/chown -R www-data\:www-data /var/www/html/, /bin/chmod -R 755 /var/www/html/
EOF
sudo chmod 0440 "${SUDOERS_FILE}"

echo "[4/5] Preparando directorio para GitHub Actions Self-Hosted Runner en ${RUNNER_DIR}..."
mkdir -p "${RUNNER_DIR}"
cd "${RUNNER_DIR}"

if [ ! -f "config.sh" ]; then
  curl -o actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz -L \
    "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
  tar xzf "./actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
fi

echo "[5/5] Instalación base completada."
echo "Para vincular el Runner con tu repositorio GitHub ejecuta:"
echo "  cd ${RUNNER_DIR}"
echo "  ./config.sh --url https://github.com/<ORG_O_USUARIO>/sefi_ti_project --token <TU_TOKEN_GITHUB>"
echo "  sudo ./svc.sh install && sudo ./svc.sh start"
