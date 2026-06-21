document.addEventListener('DOMContentLoaded', () => {
    // Lógica visual básica para cambiar pestañas de Login
    const loginBtns = document.querySelectorAll('main button');
    if (loginBtns.length >= 2) {
        const btnEstudiante = loginBtns[0];
        const btnArrendador = loginBtns[1];

        if(btnEstudiante.textContent === 'ESTUDIANTE' && btnArrendador.textContent === 'ARRENDADOR') {
            btnEstudiante.addEventListener('click', () => {
                btnEstudiante.className = 'btn-primary';
                btnArrendador.className = 'btn-outline';
            });
            
            btnArrendador.addEventListener('click', () => {
                btnArrendador.className = 'btn-primary';
                btnEstudiante.className = 'btn-outline';
            });
        }
    }
});