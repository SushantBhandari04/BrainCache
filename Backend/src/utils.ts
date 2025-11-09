export function generateHash(num: number): string{
    const str:string = "jhdbcjhdjfhsdgvcmbvadmhcvhjav";

    let hash:string = "";

    for(let i=0;i<num;i++){
        hash += str[Math.floor(Math.random()*str.length)];
    }
    return hash;
}