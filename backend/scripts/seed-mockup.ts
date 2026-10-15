import { pool } from '../src/config/database';

async function seedMockup() {
  try {
    // Categorías
    await pool.query("INSERT INTO categorias (nombre) VALUES ('Pupusas Tradicionales'), ('Pupusas Especiales'), ('Bebidas Frías'), ('Bebidas Calientes'), ('Antojitos') ON CONFLICT (nombre) DO NOTHING");
    
    const catResult = await pool.query("SELECT id, nombre FROM categorias");
    const cats: Record<string, number> = {};
    catResult.rows.forEach(r => cats[r.nombre] = r.id);

    // Productos
    const productos = [
      { cat: 'Pupusas Tradicionales', nom: 'Pupusa Revuelta', desc: 'Frijol, queso y chicharrón de cerdo', precio: 0.60 },
      { cat: 'Pupusas Tradicionales', nom: 'Pupusa de Queso', desc: 'Mucho queso derretido', precio: 0.60 },
      { cat: 'Pupusas Tradicionales', nom: 'Pupusa de Frijol con Queso', desc: 'Frijoles molidos y queso', precio: 0.60 },
      { cat: 'Pupusas Tradicionales', nom: 'Pupusa de Chicharrón', desc: 'Solo chicharrón de cerdo', precio: 0.60 },
      { cat: 'Pupusas Tradicionales', nom: 'Pupusa de Ayote', desc: 'Ayote tierno picado con queso', precio: 0.60 },
      
      { cat: 'Pupusas Especiales', nom: 'Pupusa Loca', desc: 'De todo un poco (Jalapeño, ajo, mora, pollo, etc.)', precio: 1.50 },
      { cat: 'Pupusas Especiales', nom: 'Pupusa de Ajo', desc: 'Queso con ajo rostizado', precio: 0.85 },
      { cat: 'Pupusas Especiales', nom: 'Pupusa de Jalapeño', desc: 'Queso con trozos de jalapeño picante', precio: 0.85 },
      { cat: 'Pupusas Especiales', nom: 'Pupusa de Mora', desc: 'Queso con hoja de mora', precio: 0.85 },
      
      { cat: 'Bebidas Frías', nom: 'Horchata Salvadoreña', desc: 'Horchata de morro bien fría', precio: 1.00 },
      { cat: 'Bebidas Frías', nom: 'Fresco de Cebada', desc: 'Refresco tradicional rosado', precio: 1.00 },
      { cat: 'Bebidas Frías', nom: 'Kolashampan', desc: 'Gaseosa sabor a Kolashampan (Lata)', precio: 0.85 },
      
      { cat: 'Bebidas Calientes', nom: 'Chocolate Caliente', desc: 'Chocolate de tablilla artesanal', precio: 1.25 },
      { cat: 'Bebidas Calientes', nom: 'Café de Palo', desc: 'Café recién colado', precio: 0.75 },
      
      { cat: 'Antojitos', nom: 'Empanadas de Leche', desc: 'Empanadas de plátano rellenas de leche (Orden de 3)', precio: 1.50 },
      { cat: 'Antojitos', nom: 'Pasteles de Picadillo', desc: 'Pasteles fritos de carne y verdura (Orden de 3)', precio: 1.25 }
    ];

    for (const p of productos) {
      if (!cats[p.cat]) continue;
      await pool.query(
        "INSERT INTO productos (categoria_id, nombre, descripcion, precio) VALUES ($1, $2, $3, $4)",
        [cats[p.cat], p.nom, p.desc, p.precio]
      );
    }
    
    // Mesas de prueba
    for (let i = 1; i <= 5; i++) {
        await pool.query(
            "INSERT INTO mesas (numero_mesa, codigo_qr) VALUES ($1, $2) ON CONFLICT (numero_mesa) DO NOTHING",
            [i, `MESA-${i}-MOCKUP`]
        );
    }

    console.log("Datos mockup de Pupusería inyectados correctamente.");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
seedMockup();
